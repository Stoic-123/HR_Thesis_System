import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, Image, ScrollView, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import MapViewWrapper from '../components/MapViewWrapper';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';
import useAttendanceStore from '../stores/useAttendanceStore';
import { timeModeService } from '../services/api';
import useAuthStore from '../stores/useAuthStore';

export default function OnlineAttendanceScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [photo, setPhoto] = useState(null);
  const [remark, setRemark] = useState('');
  const [hasActivity, setHasActivity] = useState(false);
  const [timeModeId, setTimeModeId] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState(null);
  const cameraRef = useRef(null);
  const { recordOnline, isLoading, error, clearError } = useAttendanceStore();

  useEffect(() => {
    getLocation();
    loadTimeMode();
  }, []);

  const normalize = (s) =>
    (s || '')
      .toString()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const pickTimeModeId = (modes) => {
    const scored = (modes || []).map((m) => {
      const hay = normalize(`${m?.name || ''} ${m?.remark || ''}`);
      let score = 0;
      if (hay.includes('time in')) score += 100;
      if (hay.includes('check in')) score += 90;
      if (hay.includes('clock in')) score += 80;
      if (hay === 'in') score += 70;
      return { id: m?.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best?.score > 0 && best?.id) return best.id;
    return modes?.[0]?.id || null;
  };

  const loadTimeMode = async () => {
    try {
      const res = await timeModeService.getAll(1, 50);
      const modes = res?.data || [];
      const id = pickTimeModeId(modes);
      setTimeModeId(id);
    } catch (e) {
      setTimeModeId(null);
    }
  };

  const getLocation = async () => {
    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') return;
    let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      // Capture at native quality first
      const photoData = await cameraRef.current.takePictureAsync({ quality: 1, base64: false });

      // Resize to max 800px wide and compress to ~60% — keeps face clear but slashes file size
      const compressed = await ImageManipulator.manipulateAsync(
        photoData.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      setPhoto(compressed.uri);
      setIsCameraOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle camera button press - check permissions first
  const handleOpenCamera = async () => {
    if (!permission) {
      return; // permission is still loading
    }
    if (!permission.granted) {
      const { status } = await requestPermission();
      if (status === 'granted') {
        setIsCameraOpen(true);
      }
    } else {
      setIsCameraOpen(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? COLORS.dark.bg : '#F5F5F7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <Pressable onPress={() => navigateTo('Home')} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Online Attendance</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          {location ? (
            <MapViewWrapper
              style={styles.map}
              location={location}
              primaryColor={primaryColor}
              isDark={isDark}
              markerSize={100}
            />
          ) : (
            <View style={[styles.map, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialIcons name="location-off" size={40} color={isDark ? '#999999' : '#8E8E93'} />
            </View>
          )}
        </View>

        {/* Camera Section */}
        <View style={[styles.card, { backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF' }]}>
          {!photo ? (
            <Pressable
              style={styles.cameraButton}
              onPress={handleOpenCamera}
            >
              <View style={[styles.cameraIcon, { backgroundColor: primaryColor }]}>
                <MaterialIcons name="camera-alt" size={40} color="#FFFFFF" />
              </View>
              <Text style={[styles.cameraText, { color: '#64748B' }]}>Tap to take a photo</Text>
            </Pressable>
          ) : (
            <View>
              <Text style={[styles.sectionLabel, { color: isDark ? COLORS.dark.text : '#1F2937' }]}>Photo</Text>
              <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              <Pressable
                style={styles.retakeButton}
                onPress={handleOpenCamera}
              >
                <MaterialIcons name="refresh" size={16} color={primaryColor} />
                <Text style={{ color: primaryColor, fontWeight: '600', marginLeft: 4, fontSize: 12 }}>Retake</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Remark Section */}
        <View style={[styles.card, { backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF' }]}>
          <Text style={[styles.sectionLabel, { color: isDark ? COLORS.dark.text : '#1F2937' }]}>Remark</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: isDark ? '#374151' : '#F9FAFB',
              color: isDark ? COLORS.dark.text : '#1F2937',
              borderColor: isDark ? '#4B5563' : '#E5E7EB'
            }]}
            placeholder="Enter your remarks..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            value={remark}
            onChangeText={setRemark}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Activity Checkbox Section */}
        <View style={[styles.card, { backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF' }]}>
          <Pressable
            style={styles.statusContainer}
            onPress={() => setHasActivity(!hasActivity)}
          >
            <MaterialIcons 
              name={hasActivity ? 'check-box' : 'check-box-outline-blank'} 
              size={20} 
              color={hasActivity ? primaryColor : '#9CA3AF'} 
            />
            <Text style={{ marginLeft: 8, color: isDark ? COLORS.dark.text : '#1F2937', fontSize: 14 }}>
              Has Activity (no attendance record created)
            </Text>
          </Pressable>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, { backgroundColor: primaryColor, opacity: isLoading ? 0.7 : 1 }]}
          disabled={isLoading}
          onPress={async () => {
            if (!location) {
              Alert.alert('Error', 'Location not available');
              return;
            }
            try {
              const response = await recordOnline(
                photo,
                remark,
                location.latitude.toString(),
                location.longitude.toString(),
                hasActivity,
                timeModeId || 1
              );
              if (response.result) {
                Alert.alert('Success', 'Your attendance has been recorded successfully');
                navigateTo('Home');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to record attendance');
              clearError();
            }
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Camera Modal */}
      <Modal visible={isCameraOpen} animationType="slide">
        {permission?.granted ? (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={styles.cameraHeader}>
              <Pressable onPress={() => setIsCameraOpen(false)} style={{ padding: 8 }}>
                <MaterialIcons name="close" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.cameraHeaderTitle}>Take Photo</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={{ position: 'relative', flex: 1 }}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing={cameraFacing}
                ref={cameraRef}
              />

              <View style={styles.cameraControls}>
                <Pressable onPress={() => setCameraFacing(cameraFacing === 'front' ? 'back' : 'front')} style={styles.flipButton}>
                  <MaterialIcons name="flip-camera-ios" size={28} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={handleTakePicture} style={styles.shutterButton}>
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={{ width: 44 }} />
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? COLORS.dark.bg : '#F5F5F7' }]}>
            <MaterialIcons name="camera-alt" size={64} color={isDark ? '#999999' : '#8E8E93'} style={{ marginBottom: 16 }} />
            <Text style={{ color: isDark ? '#CCCCCC' : '#8E8E93', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
              Camera permission is required to take photos
            </Text>
            <Pressable
              style={[styles.submitButton, { backgroundColor: primaryColor }]}
              onPress={async () => {
                const { status } = await requestPermission();
                if (status === 'granted') {
                  setIsCameraOpen(true);
                }
              }}
            >
              <Text style={styles.submitText}>Grant Permission</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsCameraOpen(false)}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: primaryColor, fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 28,
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cameraButton: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cameraIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cameraText: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusSelect: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOptionModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statusOptionText: {
    fontSize: 16,
  }
});

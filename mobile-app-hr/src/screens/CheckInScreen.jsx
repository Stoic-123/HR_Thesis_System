import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, Text, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MapViewWrapper from '../components/MapViewWrapper';
import * as Location from 'expo-location';
import { COLORS } from '../constants/theme';
import useAttendanceStore from '../stores/useAttendanceStore';
import { timeModeService } from '../services/api';
import useAuthStore from '../stores/useAuthStore';

export default function CheckInScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('Locating your position...');
  const [loading, setLoading] = useState(true);
  const [timeModeId, setTimeModeId] = useState(null);
  const { clock, isLoading: isClocking, error, clearError } = useAttendanceStore();

  useEffect(() => {
    getCurrentLocation();
    loadTimeMode();
  }, []);

  const normalize = (s) =>
    (s || '')
      .toString()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const pickTimeModeId = (modes, kind) => {
    const scored = (modes || []).map((m) => {
      const hay = normalize(`${m?.name || ''} ${m?.remark || ''}`);
      let score = 0;
      if (kind === 'in') {
        if (hay.includes('time in')) score += 100;
        if (hay.includes('check in')) score += 90;
        if (hay.includes('clock in')) score += 80;
        if (hay === 'in') score += 70;
      } else {
        if (hay.includes('time out')) score += 100;
        if (hay.includes('check out')) score += 90;
        if (hay.includes('clock out')) score += 80;
        if (hay === 'out') score += 70;
      }
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
      const id = pickTimeModeId(modes, 'in');
      setTimeModeId(id);
    } catch (e) {
      setTimeModeId(null);
    }
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to check in');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);

      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const fullAddress = [
          addr.name,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
        setAddress(fullAddress);
      }
    } catch (error) {
      console.error('Location error:', error);
      setAddress('Unable to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }
    try {
      const response = await clock(
        timeModeId || 1,
        location.latitude.toString(),
        location.longitude.toString(),
        false,
        "FINGER"
      );
      if (response.result) {
        Alert.alert('Check In Successful', `Location: ${address}`);
        navigateTo('Home');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to check in');
      clearError();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? COLORS.dark.bg : '#F5F5F7' }}>
      {/* Header */}
      <View
        style={{ backgroundColor: primaryColor }}
        className="pt-12 pb-4 px-4 flex-row items-center justify-between"
      >
        <Pressable onPress={() => navigateTo('Home')} className="p-1 active:opacity-75">
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">
          Check In
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Location Address Card */}
        <View style={[styles.addressCard, { backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF' }]}>
          <View className="flex-row items-start gap-3">
            <View style={{ backgroundColor: '#34C759', padding: 8, borderRadius: 20 }}>
              <MaterialIcons name="location-on" size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text style={[styles.addressText, { color: isDark ? COLORS.dark.text : '#1d1d1f' }]}>
                {address}
              </Text>
            </View>
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          {location ? (
            <MapViewWrapper
              style={styles.map}
              location={location}
              primaryColor={primaryColor}
              isDark={isDark}
              showsUserLocation={true}
              followsUserLocation={true}
              markerSize={80}
            />
          ) : (
            <View style={[styles.map, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialIcons name="location-off" size={48} color={isDark ? '#999999' : '#8E8E93'} />
              <Text style={{ color: isDark ? '#CCCCCC' : '#8E8E93', marginTop: 8 }}>Loading map...</Text>
            </View>
          )}
        </View>

        {/* Check In Button */}
        <View style={[styles.checkInCard, { backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF' }]}>
          <Pressable onPress={handleCheckIn} style={styles.checkInButton} disabled={isClocking}>
            <View style={[styles.checkInCircle, { backgroundColor: primaryColor }]}>
              {isClocking ? (
                <ActivityIndicator color="#FFFFFF" size="large" />
              ) : (
                <FontAwesome5 name="fingerprint" size={64} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.checkInText, { color: primaryColor }]}>
              {isClocking ? 'SUBMITTING...' : 'CHECK IN'}
            </Text>
          </Pressable>
        </View>

        {/* Bottom padding */}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addressCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  mapContainer: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  map: {
    width: '100%',
    height: '100%'
  },
  checkInCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  checkInButton: {
    alignItems: 'center'
  },
  checkInCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16
  },
  checkInText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: 1
  }
});

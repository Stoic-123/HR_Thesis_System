import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Pressable, 
  ScrollView, 
  Alert, 
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
  Linking,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import { BASE_URL, authService, documentService, scannerService } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen({ theme, navigateTo, onLogout }) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, fetchProfile } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const isDark = theme === 'dark';

  // Current Employee ID
  const employeeId = user?.employee?.id;

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Edit Profile Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGender, setEditGender] = useState('other');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Upload Document Modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isAutoCropping, setIsAutoCropping] = useState(false);

  // View Document Modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isSharingDoc, setIsSharingDoc] = useState(false);

  // Helper for full file URL
  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${BASE_URL}/${cleanPath}`;
  };

  // Helper to check if file is PDF
  const isPdfFile = (pathOrName) => {
    if (!pathOrName) return false;
    return String(pathOrName).toLowerCase().endsWith('.pdf');
  };

  // Load document types and employee documents
  const loadDocumentsData = async () => {
    if (!employeeId) return;
    try {
      setLoadingDocs(true);
      const typesRes = await documentService.getDocumentTypes().catch(() => ({ data: [] }));
      const types = Array.isArray(typesRes?.data) ? typesRes.data : (Array.isArray(typesRes) ? typesRes : []);
      setDocumentTypes(types);
      if (types.length > 0) {
        setSelectedDocTypeId(prev => prev || String(types[0].id));
      }

      const docs = await documentService.getEmployeeDocuments(employeeId).catch(() => []);
      setDocuments(docs || []);
    } catch (e) {
      console.log('Error loading documents:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocumentsData();
  }, [employeeId]);

  // Sync user data to edit form
  useEffect(() => {
    if (user?.employee) {
      setEditEmail(user.employee.email || '');
      setEditTelegram(user.employee.telegram_username ? user.employee.telegram_username.replace(/^@+/, '') : '');
      setEditPhone(user.employee.phone_number || user.employee.phone_number1 || '');
      setEditAddress(user.employee.address || '');
      setEditGender(user.employee.gender || 'other');
      if (Array.isArray(user.employee.documents) && user.employee.documents.length > 0) {
        setDocuments(user.employee.documents);
      }
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (fetchProfile) await fetchProfile().catch(() => {});
      await loadDocumentsData();
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenEdit = () => {
    if (user?.employee) {
      setEditEmail(user.employee.email || '');
      setEditTelegram(user.employee.telegram_username ? user.employee.telegram_username.replace(/^@+/, '') : '');
      setEditPhone(user.employee.phone_number || user.employee.phone_number1 || '');
      setEditAddress(user.employee.address || '');
      setEditGender(user.employee.gender || 'other');
    }
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (editEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        email: editEmail.trim(),
        telegram_username: editTelegram.trim().replace(/^@+/, ''),
        phone_number: editPhone.trim(),
        address: editAddress.trim(),
        gender: editGender,
      };

      const res = updateProfile ? await updateProfile(payload) : await authService.updateProfile(payload);
      if (res?.result) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        Alert.alert('Success', 'Your profile details have been updated successfully!');
        setEditModalVisible(false);
      } else {
        Alert.alert('Update Failed', res?.message || 'Unable to update profile.');
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Network error while updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const asset = result.assets[0];
        const rawName = asset.fileName || asset.uri.split('/').pop() || `doc_${Date.now()}.jpg`;
        const initialFile = {
          uri: asset.uri,
          name: rawName,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        };
        setSelectedFile(initialFile);

        if (!isPdfFile(rawName)) {
          setIsAutoCropping(true);
          try {
            const enhancedUri = await scannerService.scanDocument(asset.uri);
            if (enhancedUri) {
              setSelectedFile({
                uri: enhancedUri,
                name: `scanned_${Date.now()}.jpg`,
                type: 'image/jpeg',
              });
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              }
            }
          } catch (err) {
            console.log('Auto AI scan fallback to original:', err);
          } finally {
            setIsAutoCropping(false);
          }
        }
      }
    } catch (e) {
      console.log('Error picking image:', e);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant camera access to snap document photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const asset = result.assets[0];
        const rawName = `camera_doc_${Date.now()}.jpg`;
        const initialFile = {
          uri: asset.uri,
          name: rawName,
          type: 'image/jpeg',
        };
        setSelectedFile(initialFile);

        setIsAutoCropping(true);
        try {
          const enhancedUri = await scannerService.scanDocument(asset.uri);
          if (enhancedUri) {
            setSelectedFile({
              uri: enhancedUri,
              name: `scanned_${Date.now()}.jpg`,
              type: 'image/jpeg',
            });
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
          }
        } catch (err) {
          console.log('Auto AI scan fallback to original:', err);
        } finally {
          setIsAutoCropping(false);
        }
      }
    } catch (e) {
      console.log('Error launching camera:', e);
    }
  };

  const handleAutoCrop = async () => {
    if (!selectedFile || !selectedFile.uri) return;
    if (isPdfFile(selectedFile.name)) {
      Alert.alert('Notice', 'Auto-crop is only for image documents.');
      return;
    }

    setIsAutoCropping(true);
    try {
      const enhancedUri = await scannerService.scanDocument(selectedFile.uri);
      if (enhancedUri) {
        setSelectedFile(prev => ({
          ...prev,
          uri: enhancedUri,
          name: `scanned_${Date.now()}.jpg`,
          type: 'image/jpeg',
        }));
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        Alert.alert('AI Scan Complete', 'Document borders detected, cropped, and enhanced successfully!');
      }
    } catch (error) {
      console.warn('Auto-crop scan failed, keeping original:', error);
      Alert.alert('Scan Info', 'AI border detection completed with standard bounds.');
    } finally {
      setIsAutoCropping(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!employeeId) {
      Alert.alert('Error', 'Employee account not found.');
      return;
    }
    if (!selectedDocTypeId) {
      Alert.alert('Document Type Required', 'Please select a document type.');
      return;
    }
    if (!selectedFile || !selectedFile.uri) {
      Alert.alert('File Required', 'Please select or take a photo of the document.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const res = await documentService.uploadDocument(employeeId, selectedDocTypeId, selectedFile);
      if (res?.result) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        Alert.alert('Success', 'Document uploaded successfully!');
        setUploadModalVisible(false);
        setSelectedFile(null);
        await loadDocumentsData();
      } else {
        Alert.alert('Upload Failed', res?.message || 'Failed to upload document.');
      }
    } catch (error) {
      Alert.alert('Upload Error', error?.message || 'Network error while uploading document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = (docId, docName) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${docName || 'this document'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await documentService.deleteDocument(docId);
              if (res?.result) {
                Alert.alert('Deleted', 'Document removed successfully.');
                await loadDocumentsData();
              } else {
                Alert.alert('Error', res?.message || 'Failed to delete document.');
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete document.');
            }
          },
        },
      ]
    );
  };

  const handleViewDocument = (doc) => {
    setActiveDocument(doc);
    setViewModalVisible(true);
  };

  const handleShareDocument = async () => {
    if (!activeDocument?.document_path) return;
    const docUrl = getFileUrl(activeDocument.document_path);

    try {
      setIsSharingDoc(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
        return;
      }

      const rawExt = activeDocument.document_path.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `document_${activeDocument.id}.${rawExt}`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadRes = await FileSystem.downloadAsync(docUrl, fileUri);

      await Sharing.shareAsync(downloadRes.uri);
    } catch (e) {
      console.log('Error sharing document:', e);
      Alert.alert('Share Failed', 'Unable to export document file.');
    } finally {
      setIsSharingDoc(false);
    }
  };

  const handleOpenExternal = async () => {
    if (!activeDocument?.document_path) return;
    const docUrl = getFileUrl(activeDocument.document_path);
    try {
      const supported = await Linking.canOpenURL(docUrl);
      if (supported) {
        await Linking.openURL(docUrl);
      } else {
        await handleShareDocument();
      }
    } catch (e) {
      console.log('Error opening link:', e);
      await handleShareDocument();
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            if (onLogout) onLogout();
          },
        },
      ]
    );
  };

  const profileImageUrl = user?.employee?.profile_path 
    ? getFileUrl(user.employee.profile_path)
    : 'https://ui-avatars.com/api/?name=' + (user?.employee?.first_name || 'U') + '+' + (user?.employee?.last_name || '') + '&background=random';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  const getGenderLabel = (g) => {
    if (!g) return 'Not Set';
    const lower = String(g).toLowerCase();
    if (lower === 'male') return 'Male';
    if (lower === 'female') return 'Female';
    return 'Other';
  };

  const positionName = user?.employee?.position || 'Employee';
  const roleName = user?.employee?.role || 'Staff';
  const isRoleDistinct = roleName && roleName.toLowerCase() !== positionName.toLowerCase();

  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}
    >
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* ── 1. SIGNATURE CURVED PRIMARY HEADER ──────────────────────── */}
      <View 
        style={{ 
          backgroundColor: primaryColor,
          paddingBottom: 55,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          elevation: 8,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        }}
      >
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 12 }}>
            <TouchableOpacity 
              onPress={() => navigateTo('Home')} 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
              Employee Profile
            </Text>

            <TouchableOpacity 
              onPress={handleOpenEdit}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* ── 2. MAIN SCROLLABLE CONTENT ───────────────────────────────── */}
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        style={{ marginTop: -40 }}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
      >
        {/* HERO PROFILE CARD */}
        <View 
          style={{
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            borderWidth: 1,
            borderRadius: 24,
            paddingVertical: 22,
            paddingHorizontal: 20,
            alignItems: 'center',
            marginHorizontal: 16,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          }}
        >
          {/* Avatar with clean border */}
          <View style={{
            padding: 3,
            borderRadius: 48,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
            marginBottom: 10
          }}>
            <Image 
              source={{ uri: profileImageUrl }}
              style={{ width: 84, height: 84, borderRadius: 42 }}
            />
          </View>

          {/* Full Name */}
          <Text style={{
            fontSize: 20,
            fontWeight: '800',
            color: isDark ? COLORS.dark.text : COLORS.light.text,
            letterSpacing: -0.3,
            textAlign: 'center'
          }}>
            {`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || user?.username || 'Employee Name'}
          </Text>

          {/* Position & Department */}
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginTop: 4,
            textAlign: 'center'
          }}>
            {positionName} {user?.employee?.department ? `• ${user.employee.department}` : ''}
          </Text>

          {/* Minimalist Employee Tag */}
          <View style={{
            marginTop: 10,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: isDark ? '#D1D5DB' : '#4B5563',
              letterSpacing: 0.5,
            }}>
              {`#EMP${user?.employee?.id ? String(user?.employee?.id).padStart(5, '0') : '00000'}`}
            </Text>
          </View>
        </View>

        {/* SECTION 1: PERSONAL & CONTACT DETAILS */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: isDark ? COLORS.dark.text : COLORS.light.text,
            }}>
              Personal Details
            </Text>

            <TouchableOpacity 
              onPress={handleOpenEdit}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 }}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={12} color={primaryColor} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: primaryColor, marginLeft: 4 }}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View 
            style={{
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              borderWidth: 1,
              borderRadius: 20,
              overflow: 'hidden',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            }}
          >
            {[
              { 
                label: 'Email Address', 
                val: user?.employee?.email || 'Not configured', 
                icon: 'mail',
                iconType: 'feather',
                iconColor: primaryColor,
              },
              { 
                label: 'Telegram Username', 
                val: user?.employee?.telegram_username ? `@${user.employee.telegram_username.replace(/^@+/, '')}` : 'Not linked', 
                icon: 'paper-plane-outline',
                iconType: 'ionicons',
                iconColor: '#0EA5E9',
              },
              { 
                label: 'Phone Number', 
                val: user?.employee?.phone_number || user?.employee?.phone_number1 || 'Not provided', 
                icon: 'phone',
                iconType: 'feather',
                iconColor: '#10B981',
              },
              { 
                label: 'Residential Address', 
                val: user?.employee?.address || 'No address registered', 
                icon: 'map-pin',
                iconType: 'feather',
                iconColor: '#F59E0B',
              },
              { 
                label: 'Gender', 
                val: getGenderLabel(user?.employee?.gender), 
                icon: 'person-outline',
                iconType: 'ionicons',
                iconColor: '#8B5CF6',
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity 
                key={idx}
                onPress={handleOpenEdit}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? COLORS.dark.border : COLORS.light.border,
                }}
              >
                <View 
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14
                  }}
                >
                  {item.iconType === 'ionicons' ? (
                    <Ionicons name={item.icon} size={17} color={item.iconColor} />
                  ) : (
                    <Feather name={item.icon} size={16} color={item.iconColor} />
                  )}
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    {item.label}
                  </Text>
                  <Text 
                    style={{ fontSize: 13, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {item.val}
                  </Text>
                </View>

                <Feather name="chevron-right" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 2: EMPLOYMENT INFORMATION */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: isDark ? COLORS.dark.text : COLORS.light.text,
            }}>
              Employment Details
            </Text>
          </View>

          <View 
            style={{
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              borderWidth: 1,
              borderRadius: 20,
              overflow: 'hidden',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            }}
          >
            {[
              { 
                label: 'Position', 
                val: positionName, 
                icon: 'briefcase',
              },
              { 
                label: 'Department', 
                val: user?.employee?.department || 'General', 
                icon: 'layers',
              },
              { 
                label: 'Role / Access Level', 
                val: roleName || 'Standard Employee', 
                icon: 'user-check',
              },
              { 
                label: 'Joined Date', 
                val: formatDate(user?.employee?.joined_at || user?.employee?.created_at), 
                icon: 'calendar',
              },
            ].map((item, idx, arr) => (
              <View 
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? COLORS.dark.border : COLORS.light.border,
                }}
              >
                <View 
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14
                  }}
                >
                  <Feather name={item.icon} size={16} color={primaryColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginTop: 2 }}>
                    {item.val}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SECTION 3: DOCUMENTS */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: isDark ? COLORS.dark.text : COLORS.light.text,
              }}>
                Documents
              </Text>
              <View 
                style={{ 
                  marginLeft: 8, 
                  backgroundColor: `${primaryColor}18`, 
                  paddingHorizontal: 8, 
                  paddingVertical: 2, 
                  borderRadius: 10 
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>
                  {documents.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setUploadModalVisible(true)}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: primaryColor,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
              }}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={13} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                Upload
              </Text>
            </TouchableOpacity>
          </View>

          {/* Document List Card */}
          <View 
            style={{
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 12,
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            }}
          >
            {loadingDocs ? (
              <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={primaryColor} />
                <Text style={{ fontSize: 12, marginTop: 8, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                  Loading documents...
                </Text>
              </View>
            ) : documents.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="file-document-outline" size={36} color={isDark ? '#4B5563' : '#9CA3AF'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginTop: 8 }}>
                  No Documents Uploaded
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }}>
                  Upload National ID, Passport, or Certificate to keep your record up to date.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {documents.map((doc, idx) => {
                  const typeName = doc.documenttype?.name || doc.document_type_name || 'Personal Document';
                  const isPdf = isPdfFile(doc.document_path);

                  return (
                    <View 
                      key={doc.id || idx}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                        borderWidth: 1,
                        borderColor: isDark ? COLORS.dark.border : '#F3F4F6',
                      }}
                    >
                      {/* Document Icon */}
                      <View 
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          backgroundColor: isPdf ? '#FEE2E2' : `${primaryColor}15` 
                        }}
                      >
                        <MaterialCommunityIcons 
                          name={isPdf ? 'file-pdf-box' : 'file-image-outline'} 
                          size={22} 
                          color={isPdf ? '#EF4444' : primaryColor} 
                        />
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text 
                          style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                          numberOfLines={1}
                        >
                          {typeName}
                        </Text>
                        <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                          Uploaded: {formatDate(doc.uploaded_at || doc.created_at)}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity 
                          onPress={() => handleViewDocument(doc)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${primaryColor}15`,
                          }}
                          hitSlop={6}
                        >
                          <Feather name="eye" size={14} color={primaryColor} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={() => handleDeleteDocument(doc.id, typeName)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FEE2E2',
                          }}
                          hitSlop={6}
                        >
                          <Feather name="trash-2" size={13} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* SECTION 4: SECURITY & LOGOUT */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <View style={{ marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: isDark ? COLORS.dark.text : COLORS.light.text,
            }}>
              Security
            </Text>
          </View>

          <View 
            style={{
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              borderWidth: 1,
              borderRadius: 20,
              overflow: 'hidden',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            }}
          >
            <TouchableOpacity 
              onPress={() => navigateTo('ChangePassword')}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <View 
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14
                  }}
                >
                  <Feather name="lock" size={16} color={primaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                    Change Password
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                    Update your account login password
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          onPress={handleLogoutPress}
          style={{
            marginHorizontal: 16,
            marginTop: 24,
            paddingVertical: 14,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FCA5A5',
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PROFILE DETAILS                                             */}
      {/* ========================================================================= */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSavingProfile && setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View 
              style={{ 
                backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 20,
                maxHeight: '85%',
                borderTopWidth: 1,
                borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
              }}
            >
              {/* Drag Handle */}
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: isDark ? '#475569' : '#CBD5E1', alignSelf: 'center', marginBottom: 16 }} />

              {/* Modal Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: isDark ? COLORS.dark.border : '#F1F5F9' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: `${primaryColor}18`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name="edit-3" size={16} color={primaryColor} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                    Edit Profile Details
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => !isSavingProfile && setEditModalVisible(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View 
                  style={{ 
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: `${primaryColor}12`,
                    borderWidth: 1,
                    borderColor: `${primaryColor}30`,
                  }}
                >
                  <Feather name="info" size={15} color={primaryColor} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: primaryColor, marginLeft: 8, flex: 1, lineHeight: 16 }}>
                    Contact information and gender can be updated here. Name and avatar changes require HR Admin approval.
                  </Text>
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                    Email Address
                  </Text>
                  <View 
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                  >
                    <Feather name="mail" size={16} color={primaryColor} />
                    <TextInput 
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="e.g. employee@company.com"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{ flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                    />
                  </View>
                </View>

                {/* Telegram Username Input */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                    Telegram Username
                  </Text>
                  <View 
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color={primaryColor} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: primaryColor, marginLeft: 8 }}>@</Text>
                    <TextInput 
                      value={editTelegram}
                      onChangeText={(t) => setEditTelegram(t.replace(/^@+/, ''))}
                      placeholder="username"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      autoCapitalize="none"
                      style={{ flex: 1, marginLeft: 4, fontSize: 13, fontWeight: '600', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                    />
                  </View>
                </View>

                {/* Phone Number Input */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                    Phone Number
                  </Text>
                  <View 
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                  >
                    <Feather name="phone" size={16} color={primaryColor} />
                    <TextInput 
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="e.g. 012 345 678"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      keyboardType="phone-pad"
                      style={{ flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                    />
                  </View>
                </View>

                {/* Address Input */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                    Residential Address
                  </Text>
                  <View 
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                  >
                    <Feather name="map-pin" size={16} color={primaryColor} />
                    <TextInput 
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="e.g. Phnom Penh, Cambodia"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      style={{ flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '600', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                    />
                  </View>
                </View>

                {/* Gender Selector */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                    Gender
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { key: 'male', label: 'Male' },
                      { key: 'female', label: 'Female' },
                      { key: 'other', label: 'Other' },
                    ].map((item) => {
                      const isSelected = editGender === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => setEditGender(item.key)}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected 
                              ? primaryColor 
                              : (isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB'),
                            borderWidth: 1,
                            borderColor: isSelected 
                              ? primaryColor 
                              : (isDark ? COLORS.dark.border : '#E2E8F0'),
                          }}
                        >
                          <Text 
                            style={{ 
                              fontSize: 12, 
                              fontWeight: '800', 
                              color: isSelected ? '#FFFFFF' : (isDark ? COLORS.dark.text : COLORS.light.text) 
                            }}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Submit & Cancel Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 24 }}>
                  <TouchableOpacity
                    onPress={() => !isSavingProfile && setEditModalVisible(false)}
                    style={{ 
                      flex: 1, 
                      paddingVertical: 14, 
                      borderRadius: 16, 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderWidth: 1, 
                      borderColor: isDark ? COLORS.dark.border : '#CBD5E1',
                    }}
                    disabled={isSavingProfile}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    style={{ 
                      flex: 1, 
                      paddingVertical: 14, 
                      borderRadius: 16, 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: primaryColor,
                      flexDirection: 'row',
                      elevation: 2,
                      shadowColor: primaryColor,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                    }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={15} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                          Save Changes
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD EMPLOYEE DOCUMENT                                         */}
      {/* ========================================================================= */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUploadingDoc && setUploadModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View 
            style={{ 
              backgroundColor: isDark ? COLORS.dark.card : '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: '88%',
              borderTopWidth: 1,
              borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
            }}
          >
            {/* Drag Handle */}
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: isDark ? '#475569' : '#CBD5E1', alignSelf: 'center', marginBottom: 16 }} />

            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: isDark ? COLORS.dark.border : '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: `${primaryColor}18`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Feather name="upload-cloud" size={16} color={primaryColor} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                  Upload Document
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => !isUploadingDoc && setUploadModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {/* Step 1: Select Document Type */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                  1. Select Document Type
                </Text>
                
                {documentTypes.length === 0 ? (
                  <View 
                    style={{ 
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? COLORS.dark.text : COLORS.light.text }}>
                      Default Document Type
                    </Text>
                  </View>
                ) : (
                  <View 
                    style={{ 
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      overflow: 'hidden',
                    }}
                  >
                    <Picker
                      selectedValue={selectedDocTypeId}
                      onValueChange={(itemValue) => setSelectedDocTypeId(itemValue)}
                      dropdownIconColor={primaryColor}
                      style={{
                        color: isDark ? '#FFFFFF' : '#0F172A',
                        backgroundColor: 'transparent',
                      }}
                    >
                      {documentTypes.map((t) => (
                        <Picker.Item 
                          key={t.id} 
                          label={t.name} 
                          value={String(t.id)} 
                          color={isDark ? '#FFFFFF' : '#0F172A'}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Step 2: Choose File / Photo */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6 }}>
                  2. Select Document File or Photo
                </Text>

                {/* Source Selection Buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="camera" size={16} color={primaryColor} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? COLORS.dark.text : COLORS.light.text, marginLeft: 8 }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePickFromGallery}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                      borderWidth: 1,
                      borderColor: isDark ? COLORS.dark.border : '#E2E8F0',
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="image" size={16} color={primaryColor} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? COLORS.dark.text : COLORS.light.text, marginLeft: 8 }}>
                      Choose Photo
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* File Preview */}
                {selectedFile && (
                  <View style={{ marginTop: 12 }}>
                    <View 
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: `${primaryColor}40`,
                        backgroundColor: `${primaryColor}12`,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      {selectedFile.uri && !isPdfFile(selectedFile.name) ? (
                        <Image 
                          source={{ uri: selectedFile.uri }}
                          style={{ width: 50, height: 50, borderRadius: 10, marginRight: 12, borderWidth: 1, borderColor: primaryColor }}
                        />
                      ) : (
                        <View 
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 10,
                            marginRight: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#FEE2E2',
                          }}
                        >
                          <MaterialCommunityIcons name="file-pdf-box" size={28} color="#EF4444" />
                        </View>
                      )}
                      
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text 
                          style={{ fontSize: 12, fontWeight: '800', color: isDark ? COLORS.dark.text : COLORS.light.text }}
                          numberOfLines={1}
                        >
                          {selectedFile.name || 'Selected Document'}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor, marginTop: 2 }}>
                          Ready to upload
                        </Text>
                      </View>

                      <TouchableOpacity 
                        onPress={() => setSelectedFile(null)}
                        style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2' }}
                      >
                        <Feather name="x" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* AI Auto-Crop & Enhancement Button */}
                    {!isPdfFile(selectedFile.name) && (
                      <TouchableOpacity
                        onPress={handleAutoCrop}
                        disabled={isAutoCropping}
                        style={{
                          marginTop: 10,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: `${primaryColor}40`,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${primaryColor}10`,
                        }}
                        activeOpacity={0.8}
                      >
                        {isAutoCropping ? (
                          <ActivityIndicator size="small" color={primaryColor} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="crop-rotate" size={16} color={primaryColor} />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: primaryColor, marginLeft: 6 }}>
                              Auto-Crop & Enhance with AI
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={() => !isUploadingDoc && setUploadModalVisible(false)}
                  style={{ 
                    flex: 1, 
                    paddingVertical: 14, 
                    borderRadius: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderWidth: 1, 
                    borderColor: isDark ? COLORS.dark.border : '#CBD5E1',
                  }}
                  disabled={isUploadingDoc}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUploadDocument}
                  style={{ 
                    flex: 1, 
                    paddingVertical: 14, 
                    borderRadius: 16, 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: primaryColor,
                    flexDirection: 'row',
                    opacity: (!selectedFile || isUploadingDoc) ? 0.6 : 1,
                    elevation: 2,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  }}
                  disabled={!selectedFile || isUploadingDoc}
                >
                  {isUploadingDoc ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="upload-cloud" size={15} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginLeft: 6 }}>
                        Upload Document
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW & PREVIEW DOCUMENT (SOLID FULLSCREEN)                       */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 3: VIEW & PREVIEW DOCUMENT (SOLID FULLSCREEN)                       */}
      {/* ========================================================================= */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
          
          {/* Solid Top Header with Dynamic Island / Notch Inset Padding */}
          <View 
            style={{ 
              backgroundColor: '#0F172A',
              paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 48) : 16,
              paddingBottom: 14,
              paddingHorizontal: 16,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                onPress={() => setViewModalVisible(false)}
                style={{ 
                  width: 38, 
                  height: 38, 
                  borderRadius: 19, 
                  backgroundColor: 'rgba(255,255,255,0.12)', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                  {activeDocument?.documenttype?.name || activeDocument?.document_type_name || 'Document Preview'}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                  Uploaded: {formatDate(activeDocument?.uploaded_at || activeDocument?.created_at)}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={handleShareDocument}
                style={{ 
                  width: 38, 
                  height: 38, 
                  borderRadius: 19, 
                  backgroundColor: 'rgba(255,255,255,0.12)', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
                disabled={isSharingDoc}
                activeOpacity={0.7}
              >
                {isSharingDoc ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="share-2" size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Document Preview Canvas */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            {activeDocument?.document_path ? (
              isPdfFile(activeDocument.document_path) ? (
                <View style={{
                  backgroundColor: '#1E293B',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderRadius: 24,
                  padding: 24,
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 340,
                }}>
                  <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <MaterialCommunityIcons name="file-pdf-box" size={44} color="#EF4444" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 4 }}>
                    {activeDocument?.documenttype?.name || 'PDF Document'}
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 20 }} numberOfLines={1}>
                    {activeDocument.document_path.split('/').pop()}
                  </Text>

                  <TouchableOpacity 
                    onPress={handleOpenExternal}
                    style={{
                      backgroundColor: primaryColor,
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      marginBottom: 10,
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="external-link" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>
                      Open / View PDF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleShareDocument}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      width: '100%',
                      paddingVertical: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="download" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginLeft: 8 }}>
                      Share & Download
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: 20, 
                    overflow: 'hidden', 
                    backgroundColor: '#111827', 
                    borderWidth: 1, 
                    borderColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8
                  }}
                >
                  <Image 
                    source={{ uri: getFileUrl(activeDocument.document_path) }}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    resizeMode="contain"
                  />
                </View>
              )
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Feather name="file-text" size={48} color="#64748B" />
                <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 12, fontWeight: '600' }}>
                  Document file unavailable
                </Text>
              </View>
            )}
          </View>

          {/* Solid Bottom Action Bar */}
          <View 
            style={{ 
              backgroundColor: '#0F172A',
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : 16,
              paddingHorizontal: 20,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <TouchableOpacity 
              onPress={() => setViewModalVisible(false)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                Close Preview
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


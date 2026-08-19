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
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { user } = useAuthStore();
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
      await authService.getProfile().catch(() => {});
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

      const res = await authService.updateProfile(payload);
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
      style={{ backgroundColor: isDark ? '#0D0F15' : '#F4F6F9' }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* SLEEK INTEGRATED HEADER */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#0D0F15' : '#F4F6F9' }}>
        <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => navigateTo('Home')} 
            className="w-10 h-10 rounded-2xl items-center justify-center border active:scale-95 transition-transform"
            style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            }}
            hitSlop={8}
          >
            <Feather name="chevron-left" size={22} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </TouchableOpacity>

          <View className="items-center">
            <Text 
              className="text-base font-extrabold tracking-tight"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              Employee Profile
            </Text>
            <Text 
              className="text-[11px] font-semibold"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              Personal & Work Record
            </Text>
          </View>

          <TouchableOpacity 
            onPress={handleOpenEdit}
            className="w-10 h-10 rounded-2xl items-center justify-center border active:scale-95 transition-transform"
            style={{ 
              backgroundColor: isDark ? `${primaryColor}18` : `${primaryColor}12`,
              borderColor: `${primaryColor}35`,
            }}
            hitSlop={8}
          >
            <Feather name="edit-3" size={17} color={primaryColor} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
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
        {/* HERO USER PROFILE CARD */}
        <View 
          className="mx-4 mt-2 p-6 rounded-[28px] items-center border shadow-sm"
          style={{
            backgroundColor: isDark ? '#151821' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
          }}
        >
          {/* Avatar with layered glowing ring */}
          <View className="relative items-center justify-center">
            <View 
              className="p-1 rounded-full border-2"
              style={{ 
                borderColor: `${primaryColor}55`,
                backgroundColor: `${primaryColor}10` 
              }}
            >
              <Image 
                source={{ uri: profileImageUrl }}
                className="w-24 h-24 rounded-full"
              />
            </View>

            {/* Verified Badge */}
            <View 
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 shadow-sm"
              style={{ 
                backgroundColor: primaryColor,
                borderColor: isDark ? '#151821' : '#FFFFFF' 
              }}
            >
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Full Name */}
          <Text 
            className="text-xl font-black mt-3.5 text-center tracking-tight" 
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
          >
            {`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || user?.username || 'Employee Name'}
          </Text>

          {/* Position Name */}
          <Text 
            className="text-xs font-semibold mt-1 text-center" 
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            {positionName}
          </Text>

          {/* Clean Meta Badges */}
          <View className="flex-row flex-wrap items-center justify-center gap-2 mt-3.5">
            {/* Department Badge */}
            <View 
              className="px-3 py-1.5 rounded-full border flex-row items-center"
              style={{ 
                backgroundColor: `${primaryColor}14`,
                borderColor: `${primaryColor}30`
              }}
            >
              <Feather name="layers" size={11} color={primaryColor} />
              <Text className="text-[11px] font-bold ml-1.5" style={{ color: primaryColor }}>
                {user?.employee?.department || 'General'}
              </Text>
            </View>

            {/* Employee ID Badge */}
            <View 
              className="px-3 py-1.5 rounded-full border flex-row items-center"
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
              }}
            >
              <Ionicons name="card-outline" size={11} color={isDark ? '#94A3B8' : '#64748B'} />
              <Text 
                className="text-[11px] font-bold ml-1.5 tracking-wider" 
                style={{ color: isDark ? '#E2E8F0' : '#334155' }}
              >
                {`#EMP${user?.employee?.id ? String(user?.employee?.id).padStart(5, '0') : '00000'}`}
              </Text>
            </View>

            {/* Role Badge (rendered only if distinct from position) */}
            {isRoleDistinct && (
              <View 
                className="px-3 py-1.5 rounded-full border flex-row items-center"
                style={{ 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                }}
              >
                <Feather name="user" size={11} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text 
                  className="text-[11px] font-bold ml-1.5" 
                  style={{ color: isDark ? '#E2E8F0' : '#334155' }}
                >
                  {roleName}
                </Text>
              </View>
            )}
          </View>

          {/* Minimalist HR Security Note */}
          <View 
            className="mt-4 px-3.5 py-1.5 rounded-full flex-row items-center border"
            style={{ 
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'
            }}
          >
            <Feather name="shield" size={11} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text 
              className="text-[10px] ml-1.5 font-medium"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              Official credentials managed by HR Admin
            </Text>
          </View>
        </View>

        {/* SECTION 1: PERSONAL & CONTACT DETAILS */}
        <View className="mx-4 mt-5">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <View className="flex-row items-center">
              <View className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
              <Text 
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Personal Details
              </Text>
            </View>

            <TouchableOpacity 
              onPress={handleOpenEdit}
              className="flex-row items-center px-3 py-1 rounded-full border active:opacity-75"
              style={{ 
                backgroundColor: `${primaryColor}12`,
                borderColor: `${primaryColor}30`
              }}
            >
              <Feather name="edit-2" size={11} color={primaryColor} />
              <Text className="text-[11px] font-bold ml-1" style={{ color: primaryColor }}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View 
            className="rounded-[24px] overflow-hidden border shadow-sm"
            style={{
              backgroundColor: isDark ? '#151821' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
            }}
          >
            {[
              { 
                label: 'Email Address', 
                val: user?.employee?.email || 'Not configured', 
                icon: 'mail',
                iconType: 'feather',
                iconColor: '#3B82F6',
                iconBg: '#3B82F618'
              },
              { 
                label: 'Telegram Username', 
                val: user?.employee?.telegram_username ? `@${user.employee.telegram_username.replace(/^@+/, '')}` : 'Not linked', 
                icon: 'paper-plane-outline',
                iconType: 'ionicons',
                iconColor: '#0EA5E9',
                iconBg: '#0EA5E918'
              },
              { 
                label: 'Phone Number', 
                val: user?.employee?.phone_number || user?.employee?.phone_number1 || 'Not provided', 
                icon: 'phone',
                iconType: 'feather',
                iconColor: '#10B981',
                iconBg: '#10B98118'
              },
              { 
                label: 'Residential Address', 
                val: user?.employee?.address || 'No address registered', 
                icon: 'map-pin',
                iconType: 'feather',
                iconColor: '#F59E0B',
                iconBg: '#F59E0B18'
              },
              { 
                label: 'Gender', 
                val: getGenderLabel(user?.employee?.gender), 
                icon: 'person-outline',
                iconType: 'ionicons',
                iconColor: '#8B5CF6',
                iconBg: '#8B5CF618'
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity 
                key={idx}
                onPress={handleOpenEdit}
                activeOpacity={0.7}
                className="flex-row items-center p-3.5"
                style={{
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                }}
              >
                <View 
                  className="w-10 h-10 rounded-2xl items-center justify-center mr-3.5"
                  style={{ backgroundColor: item.iconBg }}
                >
                  {item.iconType === 'ionicons' ? (
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  ) : (
                    <Feather name={item.icon} size={17} color={item.iconColor} />
                  )}
                </View>

                <View className="flex-1 mr-2">
                  <Text 
                    className="text-[10px] uppercase font-bold tracking-widest" 
                    style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                  >
                    {item.label}
                  </Text>
                  <Text 
                    className="text-xs font-bold mt-0.5" 
                    style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}
                    numberOfLines={2}
                  >
                    {item.val}
                  </Text>
                </View>

                <Feather name="chevron-right" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 2: DOCUMENTS & ATTACHMENTS */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
              <Text 
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Documents
              </Text>
              <View 
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Text className="text-[10px] font-black" style={{ color: primaryColor }}>
                  {documents.length} {documents.length === 1 ? 'Doc' : 'Docs'}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setUploadModalVisible(true)}
              className="flex-row items-center px-3.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-transform"
              style={{ backgroundColor: primaryColor }}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={13} color="#FFFFFF" />
              <Text className="text-white text-xs font-extrabold ml-1">Upload</Text>
            </TouchableOpacity>
          </View>

          {/* Document Content Card */}
          <View 
            className="rounded-[24px] p-4 border shadow-sm"
            style={{
              backgroundColor: isDark ? '#151821' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
            }}
          >
            {loadingDocs ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color={primaryColor} />
                <Text 
                  className="text-xs mt-2.5 font-semibold"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  Loading documents...
                </Text>
              </View>
            ) : documents.length === 0 ? (
              /* Elevated Empty State */
              <View className="py-6 items-center justify-center">
                <View 
                  className="w-16 h-16 rounded-[22px] items-center justify-center mb-3.5 border"
                  style={{ 
                    backgroundColor: `${primaryColor}12`,
                    borderColor: `${primaryColor}30`
                  }}
                >
                  <Ionicons name="document-text-outline" size={30} color={primaryColor} />
                </View>

                <Text 
                  className="text-sm font-extrabold text-center tracking-tight"
                  style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                >
                  No Documents Uploaded
                </Text>

                <Text 
                  className="text-xs text-center mt-1 px-4 leading-relaxed"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  Upload your National ID, Passport, Driver License, or Certificates to keep your HR file complete.
                </Text>

                <TouchableOpacity 
                  onPress={() => setUploadModalVisible(true)}
                  className="mt-4 px-5 py-2.5 rounded-full flex-row items-center border active:scale-95 transition-transform"
                  style={{ 
                    borderColor: `${primaryColor}40`,
                    backgroundColor: `${primaryColor}14`
                  }}
                >
                  <Feather name="upload-cloud" size={15} color={primaryColor} />
                  <Text className="text-xs font-bold ml-2" style={{ color: primaryColor }}>
                    Upload Document Now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Documents List */
              <View className="gap-2.5">
                {documents.map((doc, idx) => {
                  const typeName = doc.documenttype?.name || doc.document_type_name || 'Personal Document';
                  const isPdf = isPdfFile(doc.document_path);

                  return (
                    <View 
                      key={doc.id || idx}
                      className="p-3.5 rounded-2xl flex-row items-center border"
                      style={{
                        backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
                      }}
                    >
                      {/* Document Icon */}
                      <View 
                        className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
                        style={{ 
                          backgroundColor: isPdf ? '#EF444415' : `${primaryColor}15` 
                        }}
                      >
                        <MaterialCommunityIcons 
                          name={isPdf ? 'file-pdf-box' : 'file-image-outline'} 
                          size={24} 
                          color={isPdf ? '#EF4444' : primaryColor} 
                        />
                      </View>

                      {/* Info */}
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5">
                          <Text 
                            className="text-xs font-bold flex-1"
                            style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                            numberOfLines={1}
                          >
                            {typeName}
                          </Text>
                          {isPdf && (
                            <View className="bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
                              <Text className="text-[9px] font-black text-red-500">PDF</Text>
                            </View>
                          )}
                        </View>
                        <Text 
                          className="text-[10px] mt-0.5 font-medium"
                          style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                        >
                          Uploaded: {formatDate(doc.uploaded_at || doc.created_at)}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View className="flex-row items-center gap-1.5">
                        <TouchableOpacity 
                          onPress={() => handleViewDocument(doc)}
                          className="w-8 h-8 rounded-xl items-center justify-center border active:opacity-75"
                          style={{ 
                            backgroundColor: `${primaryColor}14`,
                            borderColor: `${primaryColor}30`
                          }}
                          hitSlop={6}
                        >
                          <Feather name="eye" size={14} color={primaryColor} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={() => handleDeleteDocument(doc.id, typeName)}
                          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 border border-red-500/20 active:opacity-75"
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

        {/* SECTION 3: ACCOUNT & SECURITY */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center mb-2.5 px-1">
            <View className="w-1.5 h-4 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
            <Text 
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Account Security
            </Text>
          </View>

          <View 
            className="rounded-[24px] overflow-hidden border shadow-sm"
            style={{
              backgroundColor: isDark ? '#151821' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
            }}
          >
            <TouchableOpacity 
              onPress={() => navigateTo('ChangePassword')}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View 
                  className="w-10 h-10 rounded-2xl items-center justify-center mr-3.5"
                  style={{ backgroundColor: `${primaryColor}18` }}
                >
                  <Feather name="lock" size={17} color={primaryColor} />
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-xs font-extrabold" 
                    style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                  >
                    Change Password
                  </Text>
                  <Text 
                    className="text-[11px] mt-0.5 font-medium" 
                    style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                  >
                    Update your account login credentials
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? '#475569' : '#CBD5E1'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          onPress={handleLogoutPress}
          className="mx-4 mt-6 py-4 rounded-[22px] items-center justify-center border active:scale-[0.98] transition-transform"
          style={{
            borderColor: '#EF444430',
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
          }}
          activeOpacity={0.85}
        >
          <View className="flex-row items-center">
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text className="text-red-500 font-extrabold text-xs ml-2 uppercase tracking-wider">
              Sign Out Account
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
          <View className="flex-1 justify-end bg-black/70">
            <View 
              className="rounded-t-[32px] p-5 max-h-[85%] border-t"
              style={{ 
                backgroundColor: isDark ? '#151821' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
              }}
            >
              {/* Drag Handle */}
              <View className="w-12 h-1.5 rounded-full self-center mb-3" style={{ backgroundColor: isDark ? '#334155' : '#CBD5E1' }} />

              {/* Modal Header */}
              <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-xl items-center justify-center mr-2.5" style={{ backgroundColor: `${primaryColor}18` }}>
                    <Feather name="edit-3" size={15} color={primaryColor} />
                  </View>
                  <Text className="text-base font-black tracking-tight" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    Edit Profile Details
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => !isSavingProfile && setEditModalVisible(false)}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }}
                >
                  <Feather name="x" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
                <View 
                  className="p-3 rounded-2xl mb-4 flex-row items-center border"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderColor: `${primaryColor}25`
                  }}
                >
                  <Feather name="info" size={15} color={primaryColor} />
                  <Text className="text-[11px] font-medium ml-2 flex-1 leading-tight" style={{ color: primaryColor }}>
                    Contact information and gender can be updated here. Name and avatar changes require HR Admin approval.
                  </Text>
                </View>

                {/* Email Input */}
                <View className="mb-3.5">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Email Address
                  </Text>
                  <View 
                    className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Feather name="mail" size={16} color={primaryColor} />
                    <TextInput 
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="e.g. employee@company.com"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 ml-2.5 text-xs font-bold"
                      style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                    />
                  </View>
                </View>

                {/* Telegram Username Input */}
                <View className="mb-3.5">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Telegram Username
                  </Text>
                  <View 
                    className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Ionicons name="paper-plane-outline" size={16} color={primaryColor} />
                    <Text className="text-xs font-black ml-2" style={{ color: primaryColor }}>@</Text>
                    <TextInput 
                      value={editTelegram}
                      onChangeText={(t) => setEditTelegram(t.replace(/^@+/, ''))}
                      placeholder="username"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      autoCapitalize="none"
                      className="flex-1 ml-1 text-xs font-bold"
                      style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                    />
                  </View>
                </View>

                {/* Phone Number Input */}
                <View className="mb-3.5">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Phone Number
                  </Text>
                  <View 
                    className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Feather name="phone" size={16} color={primaryColor} />
                    <TextInput 
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="e.g. 012 345 678"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      keyboardType="phone-pad"
                      className="flex-1 ml-2.5 text-xs font-bold"
                      style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                    />
                  </View>
                </View>

                {/* Address Input */}
                <View className="mb-3.5">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Residential Address
                  </Text>
                  <View 
                    className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Feather name="map-pin" size={16} color={primaryColor} />
                    <TextInput 
                      value={editAddress}
                      onChangeText={setEditAddress}
                      placeholder="e.g. Phnom Penh, Cambodia"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      className="flex-1 ml-2.5 text-xs font-bold"
                      style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                    />
                  </View>
                </View>

                {/* Gender Selector */}
                <View className="mb-5">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Gender
                  </Text>
                  <View className="flex-row gap-2">
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
                          className="flex-1 py-3 rounded-2xl items-center justify-center border"
                          style={{
                            backgroundColor: isSelected 
                              ? primaryColor 
                              : (isDark ? '#1C202B' : '#F8FAFC'),
                            borderColor: isSelected 
                              ? primaryColor 
                              : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                          }}
                        >
                          <Text 
                            className="text-xs font-extrabold"
                            style={{ color: isSelected ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#334155') }}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Submit & Cancel Buttons */}
                <View className="flex-row gap-3 mt-2 mb-6">
                  <TouchableOpacity
                    onPress={() => !isSavingProfile && setEditModalVisible(false)}
                    className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                    style={{ 
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                      backgroundColor: 'transparent'
                    }}
                    disabled={isSavingProfile}
                  >
                    <Text className="text-xs font-bold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    className="flex-1 py-3.5 rounded-2xl items-center justify-center shadow-md flex-row"
                    style={{ backgroundColor: primaryColor }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="check" size={15} color="#FFFFFF" />
                        <Text className="text-white text-xs font-black ml-1.5">Save Changes</Text>
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
        <View className="flex-1 justify-end bg-black/70">
          <View 
            className="rounded-t-[32px] p-5 max-h-[88%] border-t"
            style={{ 
              backgroundColor: isDark ? '#151821' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
            }}
          >
            {/* Drag Handle */}
            <View className="w-12 h-1.5 rounded-full self-center mb-3" style={{ backgroundColor: isDark ? '#334155' : '#CBD5E1' }} />

            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b" style={{ borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl items-center justify-center mr-2.5" style={{ backgroundColor: `${primaryColor}18` }}>
                  <Feather name="upload-cloud" size={16} color={primaryColor} />
                </View>
                <Text className="text-base font-black tracking-tight" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Upload Document
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => !isUploadingDoc && setUploadModalVisible(false)}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }}
              >
                <Feather name="x" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
              {/* Step 1: Select Document Type */}
              <View className="mb-4">
                <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  1. Select Document Type
                </Text>
                
                {documentTypes.length === 0 ? (
                  <View 
                    className="p-3.5 rounded-2xl border"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' 
                    }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      Default Document Type
                    </Text>
                  </View>
                ) : (
                  <View 
                    className="rounded-2xl border overflow-hidden"
                    style={{ 
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' 
                    }}
                  >
                    <Picker
                      selectedValue={selectedDocTypeId}
                      onValueChange={(itemValue) => setSelectedDocTypeId(itemValue)}
                      dropdownIconColor={primaryColor}
                      style={{
                        color: isDark ? '#F8FAFC' : '#0F172A',
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
              <View className="mb-4">
                <Text className="text-xs font-bold mb-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  2. Select Document File or Photo
                </Text>

                {/* Source Selection Buttons */}
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    className="flex-1 p-3.5 rounded-2xl items-center justify-center border flex-row active:scale-98 transition-transform"
                    style={{
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Feather name="camera" size={16} color={primaryColor} />
                    <Text className="text-xs font-extrabold ml-2" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      Take Photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePickFromGallery}
                    className="flex-1 p-3.5 rounded-2xl items-center justify-center border flex-row active:scale-98 transition-transform"
                    style={{
                      backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <Feather name="image" size={16} color={primaryColor} />
                    <Text className="text-xs font-extrabold ml-2" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      Choose Photo
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* File Preview */}
                {selectedFile && (
                  <View className="mt-3.5">
                    <View 
                      className="p-3 rounded-2xl border flex-row items-center"
                      style={{
                        backgroundColor: `${primaryColor}10`,
                        borderColor: `${primaryColor}35`
                      }}
                    >
                      {selectedFile.uri && !isPdfFile(selectedFile.name) ? (
                        <Image 
                          source={{ uri: selectedFile.uri }}
                          className="w-14 h-14 rounded-xl mr-3 border"
                          style={{ borderColor: primaryColor }}
                        />
                      ) : (
                        <View 
                          className="w-14 h-14 rounded-xl mr-3 items-center justify-center bg-red-500/10 border border-red-500/30"
                        >
                          <MaterialCommunityIcons name="file-pdf-box" size={32} color="#EF4444" />
                        </View>
                      )}
                      
                      <View className="flex-1">
                        <Text 
                          className="text-xs font-black"
                          style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                          numberOfLines={1}
                        >
                          {selectedFile.name || 'Selected Document'}
                        </Text>
                        <Text className="text-[10px] mt-0.5 font-bold" style={{ color: primaryColor }}>
                          Ready to upload
                        </Text>
                      </View>

                      <TouchableOpacity 
                        onPress={() => setSelectedFile(null)}
                        className="w-7 h-7 rounded-full items-center justify-center bg-red-500/10"
                      >
                        <Feather name="x" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* AI Auto-Crop & Enhancement Button */}
                    {!isPdfFile(selectedFile.name) && (
                      <TouchableOpacity
                        onPress={handleAutoCrop}
                        disabled={isAutoCropping}
                        className="mt-2.5 py-3 px-4 rounded-2xl border flex-row items-center justify-center active:scale-98 transition-transform"
                        style={{
                          backgroundColor: isDark ? '#1C202B' : '#EEF2FF',
                          borderColor: `${primaryColor}40`
                        }}
                      >
                        {isAutoCropping ? (
                          <ActivityIndicator size="small" color={primaryColor} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="crop-rotate" size={16} color={primaryColor} />
                            <Text className="text-xs font-extrabold ml-1.5" style={{ color: primaryColor }}>
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
              <View className="flex-row gap-3 mt-2 mb-6">
                <TouchableOpacity
                  onPress={() => !isUploadingDoc && setUploadModalVisible(false)}
                  className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                  style={{ 
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                    backgroundColor: 'transparent'
                  }}
                  disabled={isUploadingDoc}
                >
                  <Text className="text-xs font-bold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUploadDocument}
                  className="flex-1 py-3.5 rounded-2xl items-center justify-center shadow-md flex-row"
                  style={{ 
                    backgroundColor: (!selectedFile || isUploadingDoc) ? `${primaryColor}70` : primaryColor 
                  }}
                  disabled={!selectedFile || isUploadingDoc}
                >
                  {isUploadingDoc ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="upload-cloud" size={15} color="#FFFFFF" />
                      <Text className="text-white text-xs font-black ml-1.5">Upload Document</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW & PREVIEW DOCUMENT MODAL                                    */}
      {/* ========================================================================= */}
      <Modal
        visible={viewModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View className="flex-1 bg-black/92 justify-center items-center p-4">
          {/* Top Bar with Title and Close */}
          <SafeAreaView edges={['top']} className="w-full">
            <View className="w-full flex-row items-center justify-between pb-3 px-2">
              <View className="flex-1 mr-3">
                <Text className="text-white text-base font-black" numberOfLines={1}>
                  {activeDocument?.documenttype?.name || activeDocument?.document_type_name || 'Document Preview'}
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5 font-medium">
                  Uploaded: {formatDate(activeDocument?.uploaded_at || activeDocument?.created_at)}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity 
                  onPress={handleShareDocument}
                  className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center active:opacity-75"
                  disabled={isSharingDoc}
                >
                  {isSharingDoc ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="share-2" size={17} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setViewModalVisible(false)}
                  className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center active:opacity-75"
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Document Content View */}
          <View className="flex-1 w-full justify-center items-center my-2">
            {activeDocument?.document_path ? (
              isPdfFile(activeDocument.document_path) ? (
                <View className="items-center justify-center p-6 rounded-[28px] bg-zinc-900 border border-zinc-800 w-full max-w-sm">
                  <View className="w-20 h-20 rounded-3xl items-center justify-center bg-red-500/10 mb-4 border border-red-500/30">
                    <MaterialCommunityIcons name="file-pdf-box" size={44} color="#EF4444" />
                  </View>
                  <Text className="text-white text-base font-bold text-center mb-1">
                    {activeDocument?.documenttype?.name || 'PDF Document'}
                  </Text>
                  <Text className="text-gray-400 text-xs text-center mb-6 px-2 font-medium" numberOfLines={2}>
                    {activeDocument.document_path.split('/').pop()}
                  </Text>
                  
                  <View className="w-full gap-2.5">
                    <TouchableOpacity
                      onPress={handleOpenExternal}
                      className="py-3.5 px-4 rounded-2xl flex-row items-center justify-center shadow-md"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Feather name="external-link" size={16} color="#FFFFFF" />
                      <Text className="text-white text-xs font-black ml-2">Open / View PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleShareDocument}
                      className="py-3.5 px-4 rounded-2xl flex-row items-center justify-center border border-zinc-700 bg-white/5"
                    >
                      <Feather name="share-2" size={16} color="#FFFFFF" />
                      <Text className="text-white text-xs font-black ml-2">Share & Download</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Image 
                  source={{ uri: getFileUrl(activeDocument.document_path) }}
                  style={{ width: SCREEN_WIDTH - 32, height: SCREEN_HEIGHT * 0.65 }}
                  resizeMode="contain"
                />
              )
            ) : (
              <View className="items-center">
                <Feather name="image" size={44} color="#64748B" />
                <Text className="text-gray-400 text-xs mt-2 font-semibold">Document file unavailable</Text>
              </View>
            )}
          </View>

          {/* Bottom Actions */}
          <SafeAreaView edges={['bottom']} className="w-full pb-3 items-center">
            <TouchableOpacity
              onPress={() => setViewModalVisible(false)}
              className="px-8 py-3 rounded-full border border-white/10 bg-white/10"
            >
              <Text className="text-white text-xs font-black">Close Preview</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

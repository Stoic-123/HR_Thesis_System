import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, Pressable, RefreshControl, 
  Modal, TextInput, Alert, ActivityIndicator, StatusBar, Image, Animated,
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import useAuthStore from '../stores/useAuthStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export default function AssetScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;

  const isDark = theme === 'dark';
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${BASE_URL}/api/asset/requests/mobile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.result) setRequests(data.data);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${BASE_URL}/api/asset/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.result) {
        setCategories(data.data);
        if (data.data.length > 0) setSelectedCategory(data.data[0].id.toString());
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadData = async () => {
    await fetchCategories();
    await fetchRequests();
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitRequest = async () => {
    if (!selectedCategory) {
      Alert.alert("Missing Details", "Please select an asset category.");
      return;
    }
    if (!requestReason || !requestReason.trim()) {
      Alert.alert("Missing Details", "Please provide a reason for your request.");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${BASE_URL}/api/asset/requests`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'assignment',
          category_id: parseInt(selectedCategory),
          reason: requestReason
        })
      });
      const data = await res.json();
      if (data.result) {
        Alert.alert("Success", "Your asset request has been submitted successfully!");
        setModalVisible(false);
        setRequestReason('');
        loadData();
      } else {
        Alert.alert("Error", data.message || "Failed to submit request");
      }
    } catch (e) {
      Alert.alert("Error", "Network connection failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReject = async (id, action) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${BASE_URL}/api/asset/requests/${id}/approve-manager`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.result) {
        Alert.alert("Success", `Request ${action}d successfully`);
        loadData();
      } else {
        Alert.alert("Error", data.message || `Failed to ${action} request`);
      }
    } catch (e) {
      Alert.alert("Error", "Network connection failed");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending_manager': return '#F59E0B'; // Amber
      case 'pending_hr': return '#F97316'; // Orange
      case 'assigned': return '#10B981'; // Emerald
      case 'available': return '#10B981'; // Returned/Emerald
      case 'rejected': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending_manager': return 'clock-outline';
      case 'pending_hr': return 'account-clock-outline';
      case 'assigned': return 'check-circle-outline';
      case 'available': return 'keyboard-return';
      case 'rejected': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderRequestCard = (item) => {
    const isDarkTheme = isDark;
    const statusColor = getStatusColor(item.status);
    const itemName = item.type === 'assignment' ? (item.category?.name || 'Any Asset') : (item.asset?.name || 'Unknown Asset');
    
    return (
      <View 
        key={item.id}
        style={{
          backgroundColor: isDarkTheme ? COLORS.dark.card : COLORS.light.card,
          borderRadius: 20,
          marginBottom: 16,
          padding: 20,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          borderWidth: 1,
          borderColor: isDarkTheme ? COLORS.dark.border : '#F3F4F6',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDarkTheme ? '#2D3748' : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
               <MaterialCommunityIcons 
                 name={item.type === 'assignment' ? 'laptop' : 'keyboard-return'} 
                 size={22} 
                 color={primaryColor} 
               />
            </View>
            <View>
              <Text style={{ color: isDarkTheme ? COLORS.dark.text : COLORS.light.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
                {itemName}
              </Text>
              <Text style={{ color: isDarkTheme ? COLORS.dark.textSecondary : COLORS.light.textSecondary, fontSize: 13, marginTop: 2 }}>
                {new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          
          <View style={{ 
            backgroundColor: `${statusColor}15`, 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4
          }}>
            <MaterialCommunityIcons name={getStatusIcon(item.status)} size={14} color={statusColor} />
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: isDarkTheme ? COLORS.dark.bg : '#F9FAFB', padding: 12, borderRadius: 12, marginTop: 4 }}>
          <Text style={{ color: isDarkTheme ? COLORS.dark.textSecondary : '#4B5563', fontSize: 14, fontStyle: 'italic' }} numberOfLines={3}>
            "{item.reason || 'No reason provided'}"
          </Text>
        </View>

        {(item.manager_comment || item.hr_comment) && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkTheme ? COLORS.dark.border : '#E5E7EB', gap: 6 }}>
            {item.manager_comment && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MaterialCommunityIcons name="account-tie" size={16} color={primaryColor} />
                <Text style={{ color: isDarkTheme ? COLORS.dark.textSecondary : '#4B5563', fontSize: 13, flex: 1 }}>
                  Manager: {item.manager_comment}
                </Text>
              </View>
            )}
            {item.hr_comment && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MaterialCommunityIcons name="shield-account" size={16} color={primaryColor} />
                <Text style={{ color: isDarkTheme ? COLORS.dark.textSecondary : '#4B5563', fontSize: 13, flex: 1 }}>
                  HR: {item.hr_comment}
                </Text>
              </View>
            )}
          </View>
        )}

        {item.status === 'pending_manager' && item.manager_id === user?.employee?.id && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Pressable 
              onPress={() => handleApproveReject(item.id, 'reject')}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: isDarkTheme ? '#374151' : '#F3F4F6', alignItems: 'center' }}
            >
              <Text style={{ color: isDarkTheme ? COLORS.dark.text : '#4B5563', fontWeight: '700' }}>Reject</Text>
            </Pressable>
            <Pressable 
              onPress={() => handleApproveReject(item.id, 'approve')}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: primaryColor, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Approve</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {/* Header Container */}
      <View 
        style={{ 
          backgroundColor: primaryColor,
          paddingBottom: 40,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          elevation: 10,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          position: 'relative',
          zIndex: 10
        }}
      >
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Pressable 
              onPress={() => navigateTo('Home')}
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 22, 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <Feather name="chevron-left" size={24} color="#FFFFFF" />
            </Pressable>
            
            <View style={{ marginLeft: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overview</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>My Assets</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={{ marginTop: 12, color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1, marginTop: -20, zIndex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} />}
        >
          {requests.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: isDark ? '#2D3748' : '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <MaterialCommunityIcons name="laptop-off" size={60} color={primaryColor} />
              </View>
              <Text style={{ color: isDark ? COLORS.dark.text : COLORS.light.text, fontSize: 18, fontWeight: 'bold' }}>No Requests Yet</Text>
              <Text style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
                You haven't made any asset requests. Tap the + button to request a new asset.
              </Text>
            </View>
          ) : (
            requests.map(renderRequestCard)
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <Pressable 
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 30,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: primaryColor,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 8,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          transform: [{ scale: pressed ? 0.95 : 1 }],
          zIndex: 20
        })}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Beautiful Bottom Sheet Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <Pressable 
            style={{ flex: 1 }} 
            onPress={() => setModalVisible(false)} 
          />
          <View style={{ 
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card, 
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 40,
            borderTopLeftRadius: 32, 
            borderTopRightRadius: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 20
          }}>
            {/* Grabber */}
            <View style={{ width: 40, height: 5, backgroundColor: isDark ? '#4B5563' : '#D1D5DB', borderRadius: 3, alignSelf: 'center', marginBottom: 24 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <View>
                <Text style={{ color: isDark ? COLORS.dark.text : COLORS.light.text, fontSize: 24, fontWeight: '800' }}>
                  Request Asset
                </Text>
                <Text style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary, fontSize: 14, marginTop: 4 }}>
                  Submit a request to your manager
                </Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="laptop" size={24} color={primaryColor} />
              </View>
            </View>

            <Text style={{ color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 8, fontSize: 15, fontWeight: '700' }}>
              Asset Category
            </Text>
            <View style={{ 
              borderWidth: 1.5, 
              borderColor: isDark ? COLORS.dark.border : '#E5E7EB', 
              borderRadius: 16, 
              marginBottom: 20,
              backgroundColor: isDark ? COLORS.dark.bg : '#F9FAFB',
              overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
              height: Platform.OS === 'ios' ? 150 : undefined
            }}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                style={{ color: isDark ? COLORS.dark.text : COLORS.light.text, height: Platform.OS === 'ios' ? 150 : 55 }}
                itemStyle={{ color: isDark ? COLORS.dark.text : COLORS.light.text, height: 150 }}
                dropdownIconColor={primaryColor}
              >
                {categories.map(c => (
                  <Picker.Item key={c.id} label={c.name} value={c.id.toString()} />
                ))}
              </Picker>
            </View>

            <Text style={{ color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 8, fontSize: 15, fontWeight: '700' }}>
              Reason for Request
            </Text>
            <TextInput 
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="e.g. Need a MacBook for iOS development..."
              placeholderTextColor={isDark ? COLORS.dark.textSecondary : '#9CA3AF'}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1.5,
                borderColor: isDark ? COLORS.dark.border : '#E5E7EB',
                borderRadius: 16,
                padding: 16,
                color: isDark ? COLORS.dark.text : COLORS.light.text,
                backgroundColor: isDark ? COLORS.dark.bg : '#F9FAFB',
                textAlignVertical: 'top',
                fontSize: 16,
                height: 120,
                marginBottom: 32
              }}
            />

            <Pressable 
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                backgroundColor: isSubmitting ? '#9CA3AF' : primaryColor,
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4
              })}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 }}>Submit Request</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

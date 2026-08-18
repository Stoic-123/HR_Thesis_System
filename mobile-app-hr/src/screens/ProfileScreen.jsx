import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Pressable, 
  ScrollView, 
  Alert, 
  RefreshControl 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import { BASE_URL, authService } from '../services/api';

export default function ProfileScreen({ theme, navigateTo, onLogout }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const isDark = theme === 'dark';

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await authService.getProfile().catch(() => {});
    setRefreshing(false);
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  const profileImageUrl = user?.employee?.profile_path 
    ? (user.employee.profile_path.startsWith('http') 
        ? user.employee.profile_path 
        : `${BASE_URL}${user.employee.profile_path.startsWith('/') ? '' : '/'}${user.employee.profile_path}`)
    : 'https://ui-avatars.com/api/?name=' + (user?.employee?.first_name || 'U') + '+' + (user?.employee?.last_name || '') + '&background=random';

  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}
    >
      {/* Header Bar */}
      <View 
        style={{ backgroundColor: primaryColor }}
        className="pt-12 pb-4 px-4 flex-row items-center justify-between"
      >
        <Pressable onPress={() => navigateTo('Home')} className="p-1 active:opacity-75">
          <MaterialIcons name="arrow-back-ios" size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">Employee Profile</Text>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
      >
        {/* User Card */}
        <View className="items-center p-6 mt-4">
          <Image 
            source={{ uri: profileImageUrl }}
            className="w-24 h-24 rounded-full border-4 border-amber-500 shadow-md mb-3"
          />
          <Text className="text-lg font-bold" style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}>
            {`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || 'Employee Name'}
          </Text>
          <Text className="text-xs" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
            {user?.employee?.position || 'Employee Position'}
          </Text>
          <Text className="text-[10px] mt-1 bg-amber-500/10 px-2 py-0.5 rounded text-amber-500 font-bold uppercase">
            {user?.employee?.department || 'Department'}
          </Text>
        </View>

        {/* Profile Details List (Read-Only) */}
        <View 
          className="border-y m-3 rounded-2xl overflow-hidden shadow-sm"
          style={{
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
          }}
        >
          {[
            { label: 'Email', val: user?.employee?.email || 'N/A', icon: 'email' },
            { label: 'Telegram Username', val: user?.employee?.telegram_username ? `@${user.employee.telegram_username}` : 'Not Set', icon: 'send' },
            { label: 'Phone Number', val: user?.employee?.phone_number || 'Not Set', icon: 'phone' },
            { label: 'Address', val: user?.employee?.address || 'Not Set', icon: 'location-on' },
            { label: 'Gender', val: user?.employee?.gender || 'N/A', icon: 'person' },
            { label: 'Employee ID', val: `#EMP${user?.employee?.id ? String(user?.employee?.id).padStart(5, '0') : '00000'}`, icon: 'badge' },
            { label: 'Role', val: user?.employee?.role || 'N/A', icon: 'verified-user' }
          ].map((item, idx) => (
            <View 
              key={idx}
              className="flex-row items-center p-4 border-b"
              style={{
                borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              }}
            >
              <MaterialIcons name={item.icon} size={20} color={primaryColor} />
              <View className="ml-4 flex-1">
                <Text className="text-[10px] uppercase font-bold" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>{item.label}</Text>
                <Text className="text-xs font-semibold mt-0.5" style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}>{item.val}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable 
          onPress={handleLogoutPress}
          className="mx-4 my-6 py-3.5 rounded-xl items-center justify-center border active:opacity-90"
          style={{
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="logout" size={18} color="#ef4444" />
            <Text className="text-red-500 font-bold text-xs ml-2">Logout</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

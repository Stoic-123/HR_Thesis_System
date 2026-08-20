import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';

export default function ChangePasswordScreen({ onPasswordChanged, navigateTo, theme = 'dark' }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { user, isDefaultPassword, changePassword, isLoading } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const isDark = theme === 'dark';

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    if (navigateTo) {
      navigateTo('Profile');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }

    try {
      const response = await changePassword(
        currentPassword.trim(),
        newPassword,
        confirmPassword
      );

      if (response?.result) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        Alert.alert('Success', 'Password changed successfully!', [
          {
            text: 'OK',
            onPress: () => {
              if (onPasswordChanged) {
                onPasswordChanged();
              } else if (navigateTo) {
                navigateTo('Profile');
              }
            },
          },
        ]);
      } else {
        Alert.alert('Error', response?.message || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert(
        'Change Password Failed',
        error?.message || 'An error occurred while changing your password'
      );
    }
  };

  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: isDark ? '#0D0F15' : '#F4F6F9' }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* HEADER BAR */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: isDark ? '#0D0F15' : '#F4F6F9' }}>
        <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
          {!isDefaultPassword ? (
            <TouchableOpacity 
              onPress={handleBack}
              className="w-10 h-10 rounded-2xl items-center justify-center border active:scale-95 transition-transform"
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              }}
              hitSlop={8}
            >
              <Feather name="chevron-left" size={22} color={isDark ? '#F1F5F9' : '#0F172A'} />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}

          <View className="items-center">
            <Text 
              className="text-base font-extrabold tracking-tight"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              Security Settings
            </Text>
            <Text 
              className="text-[11px] font-semibold"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              Change Account Password
            </Text>
          </View>

          <View className="w-10 h-10 items-center justify-center">
            <View 
              className="w-8 h-8 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${primaryColor}18` }}
            >
              <Feather name="shield" size={15} color={primaryColor} />
            </View>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              flex: 1,
              paddingHorizontal: 20,
              paddingTop: 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* HERO INFO CARD */}
            <View 
              className="p-5 rounded-[26px] border shadow-sm mb-5"
              style={{
                backgroundColor: isDark ? '#151821' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
              }}
            >
              <View className="flex-row items-center mb-3">
                <View 
                  className="w-12 h-12 rounded-2xl items-center justify-center mr-3.5 border"
                  style={{ 
                    backgroundColor: `${primaryColor}14`,
                    borderColor: `${primaryColor}30`
                  }}
                >
                  <Feather name="lock" size={22} color={primaryColor} />
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-base font-extrabold tracking-tight"
                    style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                  >
                    {isDefaultPassword ? 'Default Password Detected' : 'Update Credentials'}
                  </Text>
                  <Text 
                    className="text-xs font-semibold mt-0.5"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    {isDefaultPassword 
                      ? 'Please choose a secure new password to continue.' 
                      : 'Ensure your new password has at least 6 characters.'}
                  </Text>
                </View>
              </View>

              <View 
                className="px-3.5 py-2 rounded-xl flex-row items-center border"
                style={{ 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'
                }}
              >
                <Ionicons name="information-circle-outline" size={15} color={primaryColor} />
                <Text 
                  className="text-[11px] font-medium ml-2 flex-1"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  Use a strong mix of letters, numbers, and symbols for best security.
                </Text>
              </View>
            </View>

            {/* FORM CARD */}
            <View 
              className="p-5 rounded-[26px] border shadow-sm space-y-4"
              style={{
                backgroundColor: isDark ? '#151821' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
              }}
            >
              {/* Current Password Field */}
              <View>
                <Text 
                  className="text-xs font-bold mb-1.5 px-0.5"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  Current Password
                </Text>
                <View 
                  className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                  style={{ 
                    backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                  }}
                >
                  <Feather name="key" size={16} color={primaryColor} />
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 ml-2.5 text-xs font-bold"
                    style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password Field */}
              <View className="mt-3">
                <Text 
                  className="text-xs font-bold mb-1.5 px-0.5"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  New Password
                </Text>
                <View 
                  className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                  style={{ 
                    backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                  }}
                >
                  <Feather name="lock" size={16} color={primaryColor} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min. 6 chars)"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 ml-2.5 text-xs font-bold"
                    style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View className="mt-3">
                <Text 
                  className="text-xs font-bold mb-1.5 px-0.5"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                >
                  Confirm New Password
                </Text>
                <View 
                  className="flex-row items-center px-3.5 py-3 rounded-2xl border"
                  style={{ 
                    backgroundColor: isDark ? '#1C202B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                  }}
                >
                  <Feather name="check-circle" size={16} color={primaryColor} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 ml-2.5 text-xs font-bold"
                    style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#94A3B8' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ACTION BUTTON */}
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                className="mt-6 py-4 rounded-2xl items-center justify-center shadow-md flex-row active:scale-[0.98] transition-transform"
                style={{
                  backgroundColor: primaryColor,
                  opacity: (isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) ? 0.5 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text className="text-white text-xs font-black ml-2 uppercase tracking-wider">
                      Save New Password
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SYSTEM FOOTER */}
            <View className="mt-8 items-center">
              <Text 
                className="text-[11px] font-semibold tracking-wider"
                style={{ color: isDark ? '#475569' : '#94A3B8' }}
              >
                HR Management System • Sarana
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

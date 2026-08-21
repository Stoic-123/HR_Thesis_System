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
import { MaterialCommunityIcons, Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  const slideAnim = React.useRef(new Animated.Value(15)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
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
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match.');
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
        const errorMsg = typeof response?.message === 'string' ? response.message : 'Failed to change password.';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      const displayMsg = typeof error?.message === 'string' ? error.message : 'An error occurred while changing your password.';
      Alert.alert('Change Password Failed', displayMsg);
    }
  };

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
            {!isDefaultPassword ? (
              <TouchableOpacity 
                onPress={handleBack} 
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
            ) : (
              <View style={{ width: 40, height: 40 }} />
            )}

            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
              Security Settings
            </Text>

            <View 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="shield" size={18} color="#FFFFFF" />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── 2. SCROLLABLE FORM CONTENT ──────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ marginTop: -40 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              paddingHorizontal: 16,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* HERO SECURITY CARD */}
            <View 
              style={{
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                borderWidth: 1,
                borderRadius: 24,
                paddingVertical: 20,
                paddingHorizontal: 18,
                marginHorizontal: 0,
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${primaryColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Feather name="lock" size={20} color={primaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '800',
                    color: isDark ? COLORS.dark.text : COLORS.light.text,
                    letterSpacing: -0.3,
                  }}>
                    {isDefaultPassword ? 'Default Password Detected' : 'Update Password'}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginTop: 2,
                  }}>
                    {isDefaultPassword 
                      ? 'Please choose a secure new password to continue.' 
                      : 'Set a new password with at least 6 characters.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* FORM CARD */}
            <View 
              style={{
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                borderWidth: 1,
                borderRadius: 24,
                padding: 18,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}
            >
              {/* Current Password Field */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6, paddingHorizontal: 2 }}>
                  Current Password
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
                    borderColor: isDark ? COLORS.dark.border : '#E5E7EB',
                  }}
                >
                  <Feather name="key" size={16} color={primaryColor} />
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: 13,
                      fontWeight: '600',
                      color: isDark ? COLORS.dark.text : COLORS.light.text,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password Field */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6, paddingHorizontal: 2 }}>
                  New Password
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
                    borderColor: isDark ? COLORS.dark.border : '#E5E7EB',
                  }}
                >
                  <Feather name="lock" size={16} color={primaryColor} />
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min. 6 chars)"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: 13,
                      fontWeight: '600',
                      color: isDark ? COLORS.dark.text : COLORS.light.text,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? COLORS.dark.text : COLORS.light.text, marginBottom: 6, paddingHorizontal: 2 }}>
                  Confirm New Password
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
                    borderColor: isDark ? COLORS.dark.border : '#E5E7EB',
                  }}
                >
                  <Feather name="check-circle" size={16} color={primaryColor} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      marginLeft: 10,
                      fontSize: 13,
                      fontWeight: '600',
                      color: isDark ? COLORS.dark.text : COLORS.light.text,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ACTION BUTTON */}
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                style={{
                  backgroundColor: primaryColor,
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  opacity: (isLoading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) ? 0.6 : 1,
                  elevation: 2,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 5,
                }}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, marginLeft: 6, letterSpacing: 0.3 }}>
                      SAVE NEW PASSWORD
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SYSTEM FOOTER */}
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#6B7280' : '#9CA3AF' }}>
                HR Management System • Sarana
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

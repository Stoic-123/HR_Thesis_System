import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';

export default function ChangePasswordScreen({ onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { changePassword, isLoading } = useAuthStore();

  // Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters');
      return;
    }

    try {
      const response = await changePassword(
        currentPassword.trim(),
        newPassword,
        confirmPassword
      );

      if (response.result) {
        Alert.alert('Success', 'Password changed successfully!', [
          { text: 'OK', onPress: () => onPasswordChanged() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert(
        'Change Password Failed',
        error.message || 'An error occurred while changing your password'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#F5F5F7',
            paddingHorizontal: 24,
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingBottom: 24,
          }}
        >
          {/* Animated Container */}
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View style={{ marginBottom: 48 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '600',
                  color: '#1d1d1f',
                  marginBottom: 8,
                  letterSpacing: -0.5,
                }}
              >
                Change Password
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: '#6e6e73',
                  lineHeight: 20,
                }}
              >
                You're using the default password. Please change it to continue.
              </Text>
            </View>

            {/* Form Card */}
            <View
              style={{
                borderRadius: 24,
                padding: 4,
              }}
            >
              {/* Current Password */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#1d1d1f',
                    marginBottom: 8,
                  }}
                >
                  Current Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor="#6e6e73"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      height: 48,
                      backgroundColor: '#F5F5F7',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingRight: 48,
                      fontSize: 15,
                      color: '#1d1d1f',
                      borderWidth: 1,
                      borderColor: '#e3e3e8',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                      padding: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6e6e73"
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#1d1d1f',
                    marginBottom: 8,
                  }}
                >
                  New Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min 6 characters)"
                    placeholderTextColor="#6e6e73"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      height: 48,
                      backgroundColor: '#F5F5F7',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingRight: 48,
                      fontSize: 15,
                      color: '#1d1d1f',
                      borderWidth: 1,
                      borderColor: '#e3e3e8',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                      padding: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6e6e73"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#1d1d1f',
                    marginBottom: 8,
                  }}
                >
                  Confirm New Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#6e6e73"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      height: 48,
                      backgroundColor: '#F5F5F7',
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingRight: 48,
                      fontSize: 15,
                      color: '#1d1d1f',
                      borderWidth: 1,
                      borderColor: '#e3e3e8',
                    }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                      padding: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6e6e73"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleChangePassword}
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                style={({ pressed }) => ({
                  height: 48,
                  backgroundColor: '#0071e3',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  opacity: isLoading || !currentPassword || !newPassword || !confirmPassword ? 0.5 : pressed ? 0.9 : 1,
                  shadowColor: '#0071e3',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                })}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#FFFFFF',
                    }}
                  >
                    Change Password
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Footer */}
            <View
              style={{
                marginTop: 32,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: '#6e6e73',
                  textAlign: 'center',
                }}
              >
                HR Management System • Sarana
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

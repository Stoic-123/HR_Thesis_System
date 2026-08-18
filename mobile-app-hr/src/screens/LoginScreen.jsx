import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import useAuthStore from '../stores/useAuthStore';
import { BASE_URL } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const { login, isLoading } = useAuthStore();
  
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

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both username and password');
      return;
    }

    try {
      const response = await login(username.trim(), password);
      
      if (response.result) {
        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => onLoginSuccess() },
        ]);
      }
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid username or password. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleForgotPassword = async () => {
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Please enter your username first');
      return;
    }

    setIsForgotModalVisible(false);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      
      const data = await response.json();
      
      if (data.result) {
        Alert.alert('Request Sent', 'Please wait for a message from the Telegram bot. HR will reset your password to default soon!');
      } else {
        Alert.alert('Error', data.message || 'Failed to send forgot password request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send forgot password request');
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
            backgroundColor: '#F5F5F7', // Matches web background
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
            {/* Logo Section */}
            <View style={{ alignItems: 'center', marginBottom: 48 }}>
             <Image source={require('../../assets/login.png')} style={{ width: 280, height: 280, resizeMode: 'contain' }} />
            </View>

            {/* Login Card */}
            <View
              style={{
                borderRadius: 24,
                padding: 4,
              }}
            >
              {/* Welcome Text */}
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '600',
                  color: '#1d1d1f',
                  marginBottom: 8,
                  letterSpacing: -0.5,
                }}
              >
                Welcome back 
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  color: '#6e6e73',
                  marginBottom: 32,
                  lineHeight: 20,
                }}
              >
                Sign in to access your HR workspace with a clean and focused
                dashboard experience.
              </Text>

              {/* Username Field */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#1d1d1f',
                    marginBottom: 8,
                  }}
                >
                  Username
                </Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Please enter your username"
                  placeholderTextColor="#6e6e73"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    height: 48,
                    backgroundColor: '#F5F5F7',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    fontSize: 15,
                    color: '#1d1d1f',
                    borderWidth: 1,
                    borderColor: '#e3e3e8',
                  }}
                />
              </View>

              {/* Password Field */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#1d1d1f',
                    marginBottom: 8,
                  }}
                >
                  Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#6e6e73"
                    secureTextEntry={!showPassword}
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
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: [{ translateY: -12 }],
                      padding: 4,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6e6e73"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={isLoading || !username || !password}
                style={({ pressed }) => ({
                  height: 48,
                  backgroundColor: '#0071e3',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  opacity: isLoading || !username || !password ? 0.5 : pressed ? 0.9 : 1,
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
                    Login
                  </Text>
                )}
              </Pressable>

              {/* Forgot Password Button */}
              <Pressable
                onPress={() => setIsForgotModalVisible(true)}
                style={{ marginTop: 16, alignItems: 'center' }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#0071e3',
                    fontWeight: '500',
                  }}
                >
                  Forgot Password?
                </Text>
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

            {/* Forgot Password Modal */}
            <Modal
              visible={isForgotModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsForgotModalVisible(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}>
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  padding: 24,
                  width: '100%',
                  maxWidth: 340,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}>
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#FFE6E6',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}>
                      <MaterialCommunityIcons name="lock-reset" size={28} color="#FF3B30" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '600', color: '#1d1d1f', marginBottom: 8 }}>
                      Forgot Password?
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6e6e73', textAlign: 'center', lineHeight: 20 }}>
                      Click below to request a password reset. HR will send you a message via Telegram with a new default password.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: '#F5F5F7',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setIsForgotModalVisible(false)}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#1d1d1f' }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: '#FF3B30',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleForgotPassword}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#FFFFFF' }}>
                        Request Reset
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeWindStyleSheet } from "nativewind";
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible until our JS bundle is loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

NativeWindStyleSheet.setOutput({
  default: "native",
});
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';
import LoginScreen from './src/screens/LoginScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnlineAttendanceScreen from './src/screens/OnlineAttendanceScreen';
import LeaveHistoryScreen from './src/screens/LeaveHistoryScreen';
import OvertimeScreen from './src/screens/OvertimeScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import DocumentScannerScreen from './src/screens/DocumentScannerScreen';
import PayrollScreen from './src/screens/PayrollScreen';
import KpiDashboardScreen from './src/screens/KpiDashboardScreen';
import EmployeeKpiEvaluationScreen from './src/screens/EmployeeKpiEvaluationScreen';
import HolidayCalendarScreen from './src/screens/HolidayCalendarScreen';
import AssetScreen from './src/screens/AssetScreen';
import useAuthStore from './src/stores/useAuthStore';
import useNotificationStore from './src/stores/useNotificationStore';
// Helper Component for Animated Tab Item
function TabItem({ onPress, icon, iconOutline, label, isActive, isDark, extraStyle = {} }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={[{ alignItems: 'center', justifyContent: 'center', flex: 1, opacity: isActive ? 1 : 0.6 }, extraStyle]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <MaterialCommunityIcons 
          name={isActive ? icon : iconOutline} 
          size={26} 
          color={isActive ? COLORS.orange : (isDark ? '#9CA3AF' : '#6B7280')} 
        />
      </Animated.View>
      <Text 
        style={{ 
          fontSize: 10, 
          marginTop: 4, 
          fontWeight: '700', 
          color: isActive ? COLORS.orange : (isDark ? '#9CA3AF' : '#6B7280') 
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function App() {
  // Authentication & Loading States
  const { isAuthenticated, isDefaultPassword, isLoading: isAuthLoading, initialize, logout } = useAuthStore();
  const [isAppLoading, setIsAppLoading] = useState(true);

  const initSocket = useNotificationStore(state => state.initSocket);
  const disconnectSocket = useNotificationStore(state => state.disconnectSocket);
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications);
  
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState('Home'); // Home, Attendance, Leave, Notifications, Profile
  const [currentScreenParams, setCurrentScreenParams] = useState(null);

  const handleNavigate = (screen, params = null) => {
    setCurrentScreenParams(params);
    setCurrentScreen(screen);
  };
  
  // Theme State
  const [theme, setTheme] = useState('dark'); // dark / light

  // Animation State
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const fadeSplash = useRef(new Animated.Value(1)).current;

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      await initialize();
    };
    init();
  }, [initialize]);

  // Handle socket connection and list pre-fetching
  useEffect(() => {
    if (isAuthenticated) {
      initSocket();
      fetchNotifications();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, initSocket, disconnectSocket, fetchNotifications]);

  // Simple timeout to show splash for 3 seconds
  useEffect(() => {
    // Hide the native splash screen once the React Native app is mounted and rendering
    SplashScreen.hideAsync().catch(() => {});

    const timer = setTimeout(() => {
      Animated.timing(fadeSplash, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsAppLoading(false);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Reset and trigger animation whenever screen changes
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [currentScreen]);

  const handleLoginSuccess = () => {
    // Auth store handles this
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentScreen('Home');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  // Simple splash screen that definitely works!
  const renderSplashScreen = () => {
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#0F172A',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: fadeSplash,
            zIndex: 99999,
          }
        ]}
      >
        <Image
          source={require('./assets/bayon.png')}
          style={{
            width: 200,
            height: 200,
          }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  };

  // Render active screen
  const renderScreen = () => {
    if (!isAuthenticated) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (isDefaultPassword) {
      return <ChangePasswordScreen onPasswordChanged={() => {}} />;
    }
    
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen theme={theme} toggleTheme={toggleTheme} navigateTo={setCurrentScreen} />;
      case 'OnlineAttendance':  
        return <OnlineAttendanceScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'CheckIn':  
        return <CheckInScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'Leave':
        return <LeaveHistoryScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'Overtime':
        return <OvertimeScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'Notifications':
        return <NotificationScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'Profile':
        return <ProfileScreen theme={theme} navigateTo={setCurrentScreen} onLogout={handleLogout} />;
      case 'Attendance':
        return <AttendanceScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'DocumentScanner':
        return <DocumentScannerScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'Payroll':
        return <PayrollScreen theme={theme} navigateTo={setCurrentScreen} />;
      case 'KpiDashboard':
        return <KpiDashboardScreen theme={theme} navigateTo={handleNavigate} />;
      case 'EmployeeKpiEvaluation':
        return <EmployeeKpiEvaluationScreen theme={theme} navigateTo={handleNavigate} route={{ params: currentScreenParams }} />;
      case 'HolidayCalendar':
        return <HolidayCalendarScreen theme={theme} navigation={{ goBack: () => handleNavigate('Home') }} />;
      case 'Asset':
        return <AssetScreen theme={theme} navigateTo={setCurrentScreen} />;
      default:
        return <HomeScreen theme={theme} toggleTheme={toggleTheme} navigateTo={handleNavigate} />;
    }
  };

  return (
    <SafeAreaProvider>
    <View 
      className="flex-1"
      style={{ flex: 1, backgroundColor: isAuthenticated ? (isDark ? COLORS.dark.bg : COLORS.light.bg) : '#F5F5F7' }}
    >
      {/* Active Screen Rendering with Animation */}
      <Animated.View 
        style={{ 
          flex: 1, 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
        {renderScreen()}
      </Animated.View>

      {/* CUSTOM FLOATING FINGERPRINT NAVIGATION TAB BAR */}
      {isAuthenticated && !isDefaultPassword && (
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: 84,
            position: 'relative',
            paddingHorizontal: 12,
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderTopColor: isDark ? COLORS.dark.border : COLORS.light.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 20,
          }}
        >
          {/* TAB 1: HOME */}
          <TabItem 
            onPress={() => setCurrentScreen('Home')}
            icon="home-variant"
            iconOutline="home-variant-outline"
            label="Home"
            isActive={currentScreen === 'Home'}
            isDark={isDark}
          />

          {/* TAB 2: LEAVE */}
          <TabItem 
            onPress={() => setCurrentScreen('Attendance')}
            icon="calendar-check"
            iconOutline="calendar-check-outline"
            label="Attendance"
            isActive={currentScreen === 'Attendance'}
            isDark={isDark}
            extraStyle={{ marginRight: 28 }}
          />

          {/* FLOATING ACTION TAB BUTTON: FINGERPRINT (CENTER) */}
          <View style={{ position: 'absolute', top: -32, left: '53%', marginLeft: -38, zIndex: 100, alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer glow/boundary */}
            <View 
              style={{
                width: 76,
                height: 76,
                padding: 5,
                borderRadius: 38,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 12,
              }}
            >
              {/* Main Button */}
              <Pressable 
                onPress={() => setCurrentScreen('CheckIn')}
                style={({ pressed }) => ({
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: COLORS.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 4,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.1)'
                })}
              >
                <FontAwesome5 
                  name="fingerprint" 
                  size={30} 
                  color="#FFFFFF" 
                />
              </Pressable>
            </View>
          </View>

          {/* TAB 3: PAYROLL */}
          <TabItem 
            onPress={() => setCurrentScreen('Payroll')}
            icon="cash"
            iconOutline="cash"
            label="Payroll"
            isActive={currentScreen === 'Payroll'}
            isDark={isDark}
            extraStyle={{ marginLeft: 28 }}
          />

          {/* TAB 4: PROFILE */}
          <TabItem 
            onPress={() => setCurrentScreen('Profile')}
            icon="account"
            iconOutline="account-outline"
            label="Profile"
            isActive={currentScreen === 'Profile'}
            isDark={isDark}
          />
        </View>
      )}
      {isAppLoading && renderSplashScreen()}
    </View>
    </SafeAreaProvider>
  );
}

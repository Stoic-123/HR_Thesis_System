import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { mockEmployee, mockQuickAccess } from '../mockData/hrData';
import CircularGauge from '../components/CircularGauge';
import QuickAccessCard from '../components/QuickAccessCard';
import useAuthStore from '../stores/useAuthStore';
import useNotificationStore from '../stores/useNotificationStore';
import { BASE_URL } from '../services/api';

export default function HomeScreen({ theme, toggleTheme, navigateTo }) {
  const isDark = theme === 'dark';
  const { user } = useAuthStore();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const secondaryColor = user?.employee?.company?.secondary_color || COLORS.blue;
  
  const [greeting, setGreeting] = React.useState('Good morning,');
  
  React.useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning,');
      else if (hour < 18) setGreeting('Good afternoon,');
      else setGreeting('Good evening,');
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View 
      className="flex-1"
      style={{ backgroundColor: isDark ? COLORS.dark.bg : COLORS.light.bg }}
    >
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />
      
      {/* Primary Color Profile Header Container */}
      <View 
        style={{ 
          backgroundColor: primaryColor,
          paddingBottom: 60,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          elevation: 10,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          position: 'relative'
        }}
      >
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            {/* Left Avatar + Greeting */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                padding: 2, 
                backgroundColor: 'rgba(255,255,255,0.3)', 
                borderRadius: 28,
                marginRight: 14 
              }}>
                <Image 
                  source={{ 
                    uri: user?.employee?.profile_path 
                      ? (user.employee.profile_path.startsWith('http') 
                          ? user.employee.profile_path 
                          : `${BASE_URL}${user.employee.profile_path.startsWith('/') ? '' : '/'}${user.employee.profile_path}`)
                      : 'https://ui-avatars.com/api/?name=' + (user?.employee?.first_name || 'U') + '+' + (user?.employee?.last_name || '') + '&background=random' 
                  }}
                  style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'white' }}
                />
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{greeting}</Text>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>{`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || 'Employee Name'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable 
                onPress={toggleTheme}
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
                <Feather 
                  name={isDark ? "sun" : "moon"} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </Pressable>
              
              {/* Notification Trigger Button */}
              <Pressable 
                onPress={() => navigateTo('Notifications')}
                style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 22, 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  position: 'relative',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)'
                }}
              >
                <Feather 
                  name="bell" 
                  size={20} 
                  color="#FFFFFF" 
                />
                {unreadCount > 0 && (
                  <View style={{ 
                    position: 'absolute', 
                    top: 4, 
                    right: 4, 
                    minWidth: 16, 
                    height: 16, 
                    backgroundColor: '#FF4D4D', 
                    borderRadius: 8, 
                    borderWidth: 1.5, 
                    borderColor: primaryColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 2
                  }}>
                    <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Scrollable Area */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        style={{ zIndex: 110, elevation: 110, marginTop: -60 }}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Statistics Gauge Panel Card */}
        <View 
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            padding: 16,
            borderRadius: 24,
            backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            borderWidth: 1,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            marginHorizontal: 16,
            zIndex: 1
          }}
        >
          {/* Hours Gauge */}
          <CircularGauge 
            value={mockEmployee.hoursToday}
            max={mockEmployee.hoursTarget}
            label="Hours Today"
            sublabel="/8h"
            color={primaryColor}
            theme={theme}
          />
          
          {/* Leave Balance Gauge */}
          <CircularGauge 
            value={mockEmployee.leaveBalance}
            max={25} // standard total leave
            label="Leave Balance"
            sublabel="days"
            color={secondaryColor} // Company secondary color
            theme={theme}
          />
        </View>

        <View className="px-4 flex-1">
        {/* Quick Access Title */}
        <Text 
          className="text-sm font-bold mt-6 mb-2 px-1"
          style={{ color: isDark ? COLORS.dark.text : COLORS.light.text }}
        >
          Quick Access
        </Text>

        {/* Grid Menu Links */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 40 }}>
          {mockQuickAccess.map((item) => (
            <View key={item.id} style={{ width: '50%', padding: 10 }}>
              <QuickAccessCard 
                item={item} 
                theme={theme}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                onPress={() => {
                  if (item.id === 'online-attendance') {
                    navigateTo('OnlineAttendance');
                  } else if (item.id === 'leave') {
                    navigateTo('Leave');
                  } else if (item.id === 'document-scanner') {
                    navigateTo('DocumentScanner');
                  } else if (item.id === 'overtime') {
                    navigateTo('Overtime');
                  } else if (item.id === 'payroll') {
                    navigateTo('Payroll');
                  } else if (item.id === 'performance') {
                    navigateTo('KpiDashboard');
                  } else if (item.id === 'calendar') {
                    navigateTo('HolidayCalendar');
                  } else if (item.id === 'asset') {
                    navigateTo('Asset');
                  }
                }}
              />
            </View>
          ))}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

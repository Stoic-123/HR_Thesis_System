import React from 'react';
import { View, Text, Image, ScrollView, Pressable, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { mockEmployee, mockQuickAccess } from '../mockData/hrData';
import CircularGauge from '../components/CircularGauge';
import QuickAccessCard from '../components/QuickAccessCard';
import useAuthStore from '../stores/useAuthStore';
import useNotificationStore from '../stores/useNotificationStore';
import { BASE_URL, appMenuService, authService, attendanceService, leaveService } from '../services/api';

const APP_MENUS_CACHE_KEY = '@hr_app_menus_cache';

const resolveIconUrl = (iconUrl, defaultImage) => {
  if (!iconUrl) return defaultImage;
  if (typeof iconUrl === 'string' && iconUrl.startsWith('http')) {
    return iconUrl;
  }
  const cleanPath = iconUrl.startsWith('/') ? iconUrl : `/${iconUrl}`;
  return `${BASE_URL}${cleanPath}`;
};

export default function HomeScreen({ theme, toggleTheme, navigateTo }) {
  const isDark = theme === 'dark';
  const { user } = useAuthStore();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const secondaryColor = user?.employee?.company?.secondary_color || COLORS.blue;
  
  const [greeting, setGreeting] = React.useState('Good morning,');
  const [quickAccessList, setQuickAccessList] = React.useState(mockQuickAccess);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hoursToday, setHoursToday] = React.useState(0);
  const [leaveBalance, setLeaveBalance] = React.useState(0);
  const [totalLeaveDays, setTotalLeaveDays] = React.useState(25);

  // Load cached app menus from AsyncStorage on startup immediately
  React.useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(APP_MENUS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuickAccessList(parsed);
          }
        }
      } catch (e) {
        console.warn("[HomeScreen] Could not load cached app menus:", e);
      }
    })();
  }, []);

  const fetchAllData = React.useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await Promise.all([
        authService.getProfile().catch(() => {}),
        useNotificationStore.getState().fetchNotifications().catch(() => {}),
        (async () => {
          try {
            const leaveRes = await leaveService.getLeaveSummary();
            if (leaveRes && leaveRes.result) {
              setLeaveBalance(typeof leaveRes.leaveBalance === 'number' ? leaveRes.leaveBalance : 0);
              setTotalLeaveDays(typeof leaveRes.totalLeave === 'number' && leaveRes.totalLeave > 0 ? leaveRes.totalLeave : 25);
            }
          } catch (err) {
            console.log('[HomeScreen] Leave summary error:', err);
          }
        })(),
        (async () => {
          try {
            const attRes = await attendanceService.getRecords({ date: todayStr });
            const records = Array.isArray(attRes?.data) ? attRes.data : [];
            if (records.length > 0) {
              const firstScan = new Date(records[0].work_at);
              const lastScan = records.length > 1 ? new Date(records[records.length - 1].work_at) : new Date();
              const diffMs = Math.max(0, lastScan - firstScan);
              const hours = Math.min(8, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
              setHoursToday(hours);
            } else {
              setHoursToday(0);
            }
          } catch (err) {
            console.log('[HomeScreen] Attendance records error:', err);
          }
        })(),
        (async () => {
          const res = await appMenuService.getMenus();
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const dynamicMap = new Map(res.data.map(item => [item.menu_key, item]));
            const merged = mockQuickAccess
              .map(item => {
                const remote = dynamicMap.get(item.id);
                if (!remote) return item;
                if (!remote.is_active) return null;
                return {
                  ...item,
                  label: remote.label || item.label,
                  color: remote.color || item.color,
                  image: resolveIconUrl(remote.icon_url, item.image),
                  order: remote.order ?? 99,
                };
              })
              .filter(Boolean);

            merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
            setQuickAccessList(merged);

            try {
              await AsyncStorage.setItem(APP_MENUS_CACHE_KEY, JSON.stringify(merged));
            } catch (saveErr) {
              console.warn("[HomeScreen] Failed to cache app menus:", saveErr);
            }
          }
        })(),
      ]);
    } catch (e) {
      console.warn("Pull to refresh error:", e);
    }
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);
  
  const socket = useNotificationStore(state => state.socket);

  React.useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning,');
      else if (hour < 18) setGreeting('Good afternoon,');
      else setGreeting('Good evening,');
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    fetchAllData();

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Real-time App Menu Socket Listener
  React.useEffect(() => {
    if (!socket) return;
    const handleAppMenuUpdate = (updatedItem) => {
      console.log('[HomeScreen] Real-time app-menu update via socket:', updatedItem);
      if (updatedItem && updatedItem.menu_key) {
        setQuickAccessList(prevList => {
          const defaultItem = mockQuickAccess.find(m => m.id === updatedItem.menu_key);

          // 1. Menu item turned OFF
          if (updatedItem.is_active === false) {
            const filtered = prevList.filter(item => item.id !== updatedItem.menu_key);
            AsyncStorage.setItem(APP_MENUS_CACHE_KEY, JSON.stringify(filtered)).catch(() => {});
            return filtered;
          }

          // 2. Menu item turned ON (active)
          const exists = prevList.some(item => item.id === updatedItem.menu_key);
          let updatedList;

          if (exists) {
            updatedList = prevList.map(item => {
              if (item.id === updatedItem.menu_key) {
                return {
                  ...item,
                  label: updatedItem.label || item.label,
                  color: updatedItem.color || item.color,
                  image: resolveIconUrl(updatedItem.icon_url, item.image),
                  order: updatedItem.order ?? item.order ?? 99,
                };
              }
              return item;
            });
          } else {
            // Item was previously removed — construct and add back in order
            const newItem = {
              id: updatedItem.menu_key,
              label: updatedItem.label || defaultItem?.label || updatedItem.menu_key,
              color: updatedItem.color || defaultItem?.color || 'blue',
              image: resolveIconUrl(updatedItem.icon_url, defaultItem?.image),
              order: updatedItem.order ?? 99,
            };

            const fullList = [...prevList, newItem];
            const orderMap = new Map(mockQuickAccess.map((m, idx) => [m.id, idx]));
            updatedList = fullList.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
          }

          AsyncStorage.setItem(APP_MENUS_CACHE_KEY, JSON.stringify(updatedList)).catch(() => {});
          return updatedList;
        });
      }
      fetchAllData();
    };

    socket.on('app-menu:updated', handleAppMenuUpdate);
    return () => {
      socket.off('app-menu:updated', handleAppMenuUpdate);
    };
  }, [socket, fetchAllData]);
  
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
            progressViewOffset={60}
          />
        }
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
            value={hoursToday}
            max={8}
            label="Hours Today"
            sublabel="/8h"
            color={primaryColor}
            theme={theme}
          />
          
          {/* Leave Balance Gauge */}
          <CircularGauge 
            value={leaveBalance}
            max={totalLeaveDays}
            label="Leave Balance"
            sublabel="days"
            color={secondaryColor}
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
          {quickAccessList.map((item) => (
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
                  } else if (item.id === 'overtime') {
                    navigateTo('Overtime');
                  } else if (item.id === 'payroll') {
                    navigateTo('Payroll');
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

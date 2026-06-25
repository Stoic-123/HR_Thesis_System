import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import NotificationCard from '../components/NotificationCard';
import useAuthStore from '../stores/useAuthStore';
import useNotificationStore from '../stores/useNotificationStore';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationScreen({ theme, navigateTo }) {
  const { user } = useAuthStore();
  const primaryColor = user?.employee?.company?.primary_color || COLORS.orange;
  const { notifications, fetchNotifications, markAllAsRead, isLoading } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Map backend notifications to card format
  const mappedNotifications = notifications.map(item => ({
    id: item.id,
    message: `${item.title}\n${item.body}`,
    highlight: item.title,
    time: formatTimeAgo(item.created_at),
    avatar: null,
    is_read: item.is_read,
    created_at: item.created_at
  }));

  // Dynamic grouping by day
  const groupNotifications = (list) => {
    const todayList = [];
    const yesterdayList = [];
    const olderList = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    list.forEach(item => {
      const itemDate = new Date(item.created_at);
      itemDate.setHours(0, 0, 0, 0);
      
      if (itemDate.getTime() === today.getTime()) {
        todayList.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        yesterdayList.push(item);
      } else {
        olderList.push(item);
      }
    });
    
    return { today: todayList, yesterday: yesterdayList, older: olderList };
  };

  const grouped = groupNotifications(mappedNotifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
        <Text className="text-white text-base font-bold flex-1 text-center mr-6">Notification</Text>
      </View>

      {/* Quick Actions Panel */}
      {unreadCount > 0 && (
        <View 
          className="flex-row items-center justify-between px-4 py-2 border-b"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? COLORS.dark.border : COLORS.light.border
          }}
        >
          <Text className="text-xs" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
            {unreadCount} unread notification(s)
          </Text>
          <Pressable onPress={handleMarkAllRead} className="active:opacity-60">
            <Text className="text-xs font-bold" style={{ color: COLORS.orange }}>
              Mark all as read
            </Text>
          </Pressable>
        </View>
      )}

      {/* List Container */}
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
        }
      >
        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-24 pb-12">
            <MaterialIcons name="notifications-none" size={64} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text className="mt-4 text-sm font-medium" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
              No notifications yet
            </Text>
          </View>
        ) : (
          <>
            {/* TODAY SECTION */}
            {grouped.today.length > 0 && (
              <>
                <View className="px-4 pt-4 pb-2">
                  <Text className="text-xs font-bold" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                    Today
                  </Text>
                </View>
                <View 
                  className="border-y"
                  style={{ 
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border 
                  }}
                >
                  {grouped.today.map((item) => (
                    <NotificationCard key={item.id} item={item} theme={theme} />
                  ))}
                </View>
              </>
            )}

            {/* YESTERDAY SECTION */}
            {grouped.yesterday.length > 0 && (
              <>
                <View className="px-4 pt-6 pb-2">
                  <Text className="text-xs font-bold" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                    Yesterday
                  </Text>
                </View>
                <View 
                  className="border-y"
                  style={{ 
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border 
                  }}
                >
                  {grouped.yesterday.map((item) => (
                    <NotificationCard key={item.id} item={item} theme={theme} />
                  ))}
                </View>
              </>
            )}

            {/* OLDER SECTION */}
            {grouped.older.length > 0 && (
              <>
                <View className="px-4 pt-6 pb-2">
                  <Text className="text-xs font-bold" style={{ color: isDark ? COLORS.dark.textSecondary : COLORS.light.textSecondary }}>
                    Older Notifications
                  </Text>
                </View>
                <View 
                  className="border-y mb-10"
                  style={{ 
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border 
                  }}
                >
                  {grouped.older.map((item) => (
                    <NotificationCard key={item.id} item={item} theme={theme} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

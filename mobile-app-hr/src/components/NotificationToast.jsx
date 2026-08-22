import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useNotificationStore from '../stores/useNotificationStore';
import { COLORS } from '../constants/theme';

export default function NotificationToast({ theme = 'dark', onNavigate }) {
  const isDark = theme === 'dark';
  const activeToast = useNotificationStore((state) => state.activeToast);
  const hideToast = useNotificationStore((state) => state.hideToast);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (activeToast) {
      // Trigger subtle haptic feedback
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}

      // Clear existing auto-dismiss timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate In
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 5000);
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeToast]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  };

  const handlePress = () => {
    handleDismiss();
    if (onNavigate) {
      onNavigate('Notifications');
    }
  };

  if (!activeToast) return null;

  const isAnnouncement =
    (activeToast.title && activeToast.title.toLowerCase().includes('announcement')) ||
    (activeToast.body && activeToast.body.toLowerCase().includes('announcement'));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: '#000',
          },
        ]}
      >
        {/* Left Icon Pill */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isAnnouncement
                ? 'rgba(249, 115, 22, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isAnnouncement ? 'bullhorn' : 'bell-ring'}
            size={22}
            color={isAnnouncement ? COLORS.orange : COLORS.blue}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                { color: isDark ? '#F9FAFB' : '#111827' },
              ]}
            >
              {activeToast.title || 'New Notification'}
            </Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>
          <Text
            numberOfLines={2}
            style={[
              styles.body,
              { color: isDark ? '#9CA3AF' : '#4B5563' },
            ]}
          >
            {activeToast.body || 'Tap to view details'}
          </Text>
        </View>

        {/* Close Button */}
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <Feather name="x" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 42,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  timeTag: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});

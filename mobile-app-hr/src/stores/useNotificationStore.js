import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { notificationService, BASE_URL } from '../services/api';

const AUTH_TOKEN_KEY = 'auth_token';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  socket: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const res = await notificationService.getAll();
      if (res && res.result) {
        const list = res.data || [];
        const unread = list.filter(n => !n.is_read).length;
        set({ notifications: list, unreadCount: unread, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('[NotificationStore] Fetch Error:', err);
      set({ isLoading: false });
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await notificationService.markAllRead();
      if (res && res.result) {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, is_read: true })),
          unreadCount: 0
        }));
      }
    } catch (err) {
      console.error('[NotificationStore] MarkAllRead Error:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await notificationService.markRead(id);
      if (res && res.result) {
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      }
    } catch (err) {
      console.error('[NotificationStore] MarkAsRead Error:', err);
    }
  },

  initSocket: async () => {
    try {
      // Avoid duplicate connection
      if (get().socket) {
        return;
      }

      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        console.warn('[NotificationStore] No auth token found for socket initialization.');
        return;
      }

      console.log('[NotificationStore] Connecting to Socket.io server at:', BASE_URL);
      const newSocket = io(BASE_URL, {
        auth: { token },
        transports: ['websocket'], // Use websocket protocol directly
      });

      newSocket.on('connect', () => {
        console.log('[NotificationStore] Socket connected successfully! ID:', newSocket.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('[NotificationStore] Socket connection error:', err.message);
      });

      newSocket.on('notification:received', (newNotif) => {
        console.log('[NotificationStore] Real-time notification received:', newNotif);
        set((state) => {
          // Check if notification already exists to prevent duplicates
          if (state.notifications.some(n => n.id === newNotif.id)) {
            return {};
          }
          return {
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1
          };
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[NotificationStore] Socket disconnected. Reason:', reason);
      });

      set({ socket: newSocket });
    } catch (err) {
      console.error('[NotificationStore] Socket Init Error:', err);
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log('[NotificationStore] Disconnecting socket...');
      socket.disconnect();
      set({ socket: null });
    }
  }
}));

export default useNotificationStore;

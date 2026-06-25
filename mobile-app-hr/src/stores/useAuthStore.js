import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, setForceLogoutHandler } from '../services/api';

const IS_DEFAULT_PASSWORD_KEY = 'is_default_password';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isDefaultPassword: false,

  // Initialize auth state from storage
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const { token, user } = await authService.initialize();
      const isDefaultPassword = await AsyncStorage.getItem(IS_DEFAULT_PASSWORD_KEY);
      set({
        user,
        isAuthenticated: !!token,
        isLoading: false,
        isDefaultPassword: isDefaultPassword === 'true',
      });

      // Register the force-logout handler so api.js can trigger it on 401
      setForceLogoutHandler(async () => {
        await authService.clearStorage();
        await AsyncStorage.removeItem(IS_DEFAULT_PASSWORD_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false, isDefaultPassword: false });
      });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  // Login
  login: async (username, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(username, password);
      if (response.result) {
        const { user } = await authService.getAuthState();
        await AsyncStorage.setItem(IS_DEFAULT_PASSWORD_KEY, response.is_default_password ? 'true' : 'false');
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isDefaultPassword: response.is_default_password,
        });
      }
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await authService.logout();
      await AsyncStorage.removeItem(IS_DEFAULT_PASSWORD_KEY);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isDefaultPassword: false,
      });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  // Change password
  changePassword: async (current_password, new_password, confirm_password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.changePassword(current_password, new_password, confirm_password);
      if (response.result) {
        await AsyncStorage.removeItem(IS_DEFAULT_PASSWORD_KEY);
        set({
          isDefaultPassword: false,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAuthStore;

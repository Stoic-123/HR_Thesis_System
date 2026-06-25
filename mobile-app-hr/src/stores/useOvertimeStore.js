import { create } from 'zustand';
import { overtimeService } from '../services/api';

const useOvertimeStore = create((set, get) => ({
  isLoading: false,
  error: null,
  overtimeHistory: [],
  pendingOvertimes: [],

  // Fetch overtime history
  fetchOvertimeHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.getMyOvertimes();
      if (response.result) {
        set({ overtimeHistory: response.data || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch pending overtimes for manager
  fetchPendingOvertimes: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.getPendingOvertimes();
      if (response.result) {
        set({ pendingOvertimes: response.data || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Request new overtime
  requestOvertime: async (overtimeData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.requestOvertime(overtimeData);
      if (response.result) {
        // Refresh history
        await get().fetchOvertimeHistory();
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Approve overtime
  approveOvertime: async (overtimeId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.approveOvertime(overtimeId);
      if (response.result) {
        // Refresh pending overtimes
        await get().fetchPendingOvertimes();
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Reject overtime
  rejectOvertime: async (overtimeId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.rejectOvertime(overtimeId);
      if (response.result) {
        // Refresh pending overtimes
        await get().fetchPendingOvertimes();
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Cancel overtime
  cancelOvertime: async (overtimeId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await overtimeService.cancelOvertime(overtimeId);
      if (response.result) {
        // Refresh history
        await get().fetchOvertimeHistory();
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useOvertimeStore;

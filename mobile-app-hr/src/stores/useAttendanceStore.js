import { create } from 'zustand';
import { attendanceService } from '../services/api';

const useAttendanceStore = create((set, get) => ({
  isLoading: false,
  error: null,
  attendanceRecords: [],
  onlineAttendanceRecords: [],

  // Clock in/out
  clock: async (timeModeId, latitude, longitude, isMocked = false, type = "FINGER") => {
    try {
      set({ isLoading: true, error: null });
      const response = await attendanceService.clock(timeModeId, latitude, longitude, isMocked, type);
      if (response.result) {
        // Refresh records after clocking
        await get().fetchRecords();
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Record online attendance
  recordOnline: async (photoPath, remark, latitude, longitude, hasActivity, timeModeId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await attendanceService.online(photoPath, remark, latitude, longitude, hasActivity, timeModeId);
      if (response.result) {
        // Refresh records after recording online attendance
        await get().fetchRecords();
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch attendance records
  // filters: optional { date: 'YYYY-MM-DD' } — specific day, or omit for all
  fetchRecords: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const response = await attendanceService.getRecords(filters);
      if (response.result) {
        set({ attendanceRecords: response.data, isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useAttendanceStore;

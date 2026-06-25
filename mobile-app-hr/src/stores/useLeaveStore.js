import { create } from 'zustand';
import { leaveService } from '../services/api';

const useLeaveStore = create((set, get) => ({
  isLoading: false,
  error: null,
  leaveTypes: [],
  leaveHistory: [],
  pendingLeaves: [],
  leaveSummary: {
    totalLeave: 25,
    leaveUsed: 0,
    leaveBalance: 25,
    details: [],
  },

  // Fetch all leave types
  fetchLeaveTypes: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.getLeaveTypes(1, 100);
      if (response.result) {
        set({ leaveTypes: response.data || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch leave history
  fetchLeaveHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.getMyLeaves();
      if (response.result) {
        set({ leaveHistory: response.data || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch pending leaves for manager
  fetchPendingLeaves: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.getPendingLeaves();
      if (response.result) {
        set({ pendingLeaves: response.data || [], isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Fetch leave summary
  fetchLeaveSummary: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.getLeaveSummary();
      if (response.result) {
        set({
          leaveSummary: {
            totalLeave: response.totalLeave ?? 25,
            leaveUsed: response.leaveUsed ?? 0,
            leaveBalance: response.leaveBalance ?? 25,
            details: response.details || [],
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Request new leave
  requestLeave: async (leaveData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.requestLeave(leaveData);
      if (response.result) {
        // Refresh history and summaries
        await get().fetchLeaveHistory();
        await get().fetchLeaveSummary();
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Approve leave
  approveLeave: async (leaveId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.approveLeave(leaveId);
      if (response.result) {
        await get().fetchPendingLeaves(); // Refresh pending leaves
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Reject leave
  rejectLeave: async (leaveId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.rejectLeave(leaveId);
      if (response.result) {
        await get().fetchPendingLeaves(); // Refresh pending leaves
      }
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Cancel leave
  cancelLeave: async (leaveId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await leaveService.cancelLeave(leaveId);
      if (response.result) {
        await get().fetchLeaveHistory(); // Refresh leave history
        await get().fetchLeaveSummary(); // Refresh leave summary
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

export default useLeaveStore;

import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Base URL: reads from app.json extra.apiUrl first, then env var, then production fallback.
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "https://api.bayonhr.shop";
console.log("[Mobile API] BASE_URL:", BASE_URL);
// Storage keys
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";


// ---------------------------------------------------------------------------
// Force-logout bridge
// The auth store registers a callback here after it initialises so that
// api.js can trigger a logout (clear state + storage) without importing the
// store directly (which would create a circular dependency).
// ---------------------------------------------------------------------------
let _forceLogoutHandler = null;
let cachedToken = null;

export const setForceLogoutHandler = (handler) => {
  _forceLogoutHandler = handler;
};

const triggerForceLogout = () => {
  if (_forceLogoutHandler) {
    _forceLogoutHandler();
  }
};

// Helper to get token and user data from AsyncStorage
const getStoredAuthState = async () => {
  try {
    const token = cachedToken || await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !cachedToken) {
      cachedToken = token;
    }
    const userStr = await AsyncStorage.getItem(USER_DATA_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch (e) {
    console.error("Error getting stored auth state:", e);
    return { token: null, user: null };
  }
};

// Sentinel error class for expired / invalid token.
export class TokenExpiredError extends Error {
  constructor(message = "Session expired. Please log in again.") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

// Helper function for API calls
export const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const { token } = await getStoredAuthState();

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add auth token if available
    if (token) {
      console.log("[Mobile API] Sending token in header:", token);
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.log("[Mobile API] No token found in getStoredAuthState");
    }

    const config = {
      method: options.method || "GET",
      headers,
      ...options,
    };

    // Add body if present
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // 401 = token expired or invalid — clear local auth state and
      // redirect the user back to the login screen automatically.
      if (response.status === 401) {
        const err = new TokenExpiredError(data?.message || "Session expired. Please log in again.");
        triggerForceLogout();
        throw err;
      }

      let errorMsg = "Request failed";
      if (typeof data?.message === 'string' && data.message.trim()) {
        errorMsg = data.message;
      } else if (Array.isArray(data?.errors) && data.errors.length > 0 && data.errors[0]?.message) {
        errorMsg = data.errors[0].message;
      } else if (Array.isArray(data) && data.length > 0 && data[0]?.message) {
        errorMsg = data[0].message;
      } else if (typeof data?.error === 'string' && data.error.trim()) {
        errorMsg = data.error;
      }

      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.warn("API Error:", error?.message || error);
    throw error;
  }
};

// Auth Services
export const authService = {
  // Initialize: load from storage on app start
  initialize: async () => {
    return await getStoredAuthState();
  },

  // Login
  login: async (username, password) => {
    try {
      console.log("[Mobile API] Performing login request...");
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { username, password, client: "mobile" },
      });

      console.log("[Mobile API] Login response received:", JSON.stringify(response));

      // Store token and user from response
      if (response.result) {
        if (response.token) {
          console.log("[Mobile API] Setting new token in storage:", response.token);
          await authService.setToken(response.token);
        } else {
          console.log("[Mobile API] Warning: login response had no token");
        }
        // Fetch user profile after successful login
        const userProfile = await authService.getProfile();
        await authService.setUser(userProfile);
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // Continue even if API fails
    } finally {
      // Clear stored data
      cachedToken = null;
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);
    }
  },

  // Clear local storage only (used by force-logout on token expiry)
  clearStorage: async () => {
    console.log("[Mobile API] Clearing stored tokens");
    cachedToken = null;
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
  },

  // Get user profile
  getProfile: async () => {
    try {
      console.log("[Mobile API] Fetching profile (getMe)...");
      const response = await apiRequest("/api/auth/getMe");
      await authService.setUser(response);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Set token manually
  setToken: async (token) => {
    console.log("[Mobile API] setToken called with:", token);
    cachedToken = token;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  // Set user data
  setUser: async (user) => {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  },

  // Get current auth state from storage
  getAuthState: async () => {
    return await getStoredAuthState();
  },

  // Change password
  changePassword: async (current_password, new_password, confirm_password) => {
    try {
      const response = await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: { current_password, new_password, confirm_password },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Update personal profile
  updateProfile: async (data) => {
    try {
      const response = await apiRequest("/api/auth/update-profile", {
        method: "PUT",
        body: {
          email: data.email !== undefined ? data.email : undefined,
          telegram_username: data.telegram_username !== undefined ? data.telegram_username : undefined,
          phone_number: data.phone_number !== undefined ? data.phone_number : undefined,
          phone_number1: data.phone_number !== undefined ? data.phone_number : undefined,
          address: data.address !== undefined ? data.address : undefined,
          gender: data.gender !== undefined ? data.gender : undefined,
        },
      });

      if (response.result) {
        await authService.getProfile();
      }
      return response;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  },
};

// Attendance Services
export const attendanceService = {
  // Clock in/out
  clock: async (
    timeModeId,
    latitude,
    longitude,
    isMocked = false,
    type = "FINGER",
  ) => {
    try {
      const response = await apiRequest("/api/attendance/clock", {
        method: "POST",
        body: {
          time_mode_id: timeModeId,
          latitude,
          longitude,
          isMocked,
          type,
        },
      });

      return response;
    } catch (error) {
      throw error;
    }
  },

  // Online attendance
  online: async (
    photoPath,
    remark,
    latitude,
    longitude,
    hasActivity,
    timeModeId,
  ) => {
    try {
      const { token } = await getStoredAuthState();

      // Build multipart form so the photo is uploaded as a real file
      const formData = new FormData();
      if (photoPath) {
        const rawName  = photoPath.split('/').pop() || 'photo.jpg';
        const hasExt   = /\.\w{2,4}$/.test(rawName);
        const filename = hasExt ? rawName : `${rawName}.jpg`;
        formData.append('photo', { uri: photoPath, name: filename, type: 'image/jpeg' });
      }
      formData.append('remark',       remark        || '');
      formData.append('latitude',     String(latitude));
      formData.append('longitude',    String(longitude));
      formData.append('has_activity', hasActivity ? 'true' : 'false');
      if (timeModeId) formData.append('time_mode_id', String(timeModeId));

      const response = await fetch(`${BASE_URL}/api/attendance/online`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          const tokenErr = new TokenExpiredError(data.message);
          triggerForceLogout();
          throw tokenErr;
        }
        throw new Error(data.message || 'Online attendance failed');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance records
  // Optional filter: { date: 'YYYY-MM-DD' } — returns records for that specific day.
  // Omit filter to get all records.
  getRecords: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append("date", filters.date);
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest(`/api/attendance/records${query}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// TimeMode Services
export const timeModeService = {
  getAll: async (page = 1, limit = 50) => {
    try {
      const response = await apiRequest(
        `/api/timemode/get-timemode?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// TimeSheet Services
export const timeSheetService = {
  create: async (data) => {
    try {
      const response = await apiRequest("/api/timesheet/create-timesheet", {
        method: "POST",
        body: data,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getAll: async (page = 1, limit = 10) => {
    try {
      const response = await apiRequest(
        `/api/timesheet/get-timesheets?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await apiRequest(`/api/timesheet/get-timesheet/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await apiRequest(
        `/api/timesheet/update-timesheet/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await apiRequest(
        `/api/timesheet/delete-timesheet/${id}`,
        {
          method: "DELETE",
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// DayOfWeek Services
export const dayOfWeekService = {
  create: async (data) => {
    try {
      const response = await apiRequest("/api/dayofweek/create-dayofweek", {
        method: "POST",
        body: data,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getAll: async (page = 1, limit = 10) => {
    try {
      const response = await apiRequest(
        `/api/dayofweek/get-dayofweeks?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await apiRequest(`/api/dayofweek/get-dayofweek/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await apiRequest(
        `/api/dayofweek/update-dayofweek/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await apiRequest(
        `/api/dayofweek/delete-dayofweek/${id}`,
        {
          method: "DELETE",
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// EmployeeWorkingProfile Services
export const employeeWorkingProfileService = {
  create: async (data) => {
    try {
      const response = await apiRequest(
        "/api/employeeworkingprofile/create-employeeworkingprofile",
        {
          method: "POST",
          body: data,
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  getAll: async (page = 1, limit = 10) => {
    try {
      const response = await apiRequest(
        `/api/employeeworkingprofile/get-employeeworkingprofiles?page=${page}&limit=${limit}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  getByEmployeeId: async (employeeId) => {
    try {
      const response = await apiRequest(
        `/api/employeeworkingprofile/get-employeeworkingprofile/${employeeId}`,
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await apiRequest(
        `/api/employeeworkingprofile/delete-employeeworkingprofile/${id}`,
        {
          method: "DELETE",
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Leave Services
export const leaveService = {
  getLeaveTypes: async (page = 1, limit = 50) => {
    try {
      const response = await apiRequest(`/api/leavetype/get-leavetype?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  requestLeave: async (leaveData) => {
    try {
      const { token } = await getStoredAuthState();
      
      const formData = new FormData();
      formData.append("leave_type_id", String(leaveData.leave_type_id));
      formData.append("dates", JSON.stringify(leaveData.dates));
      formData.append("reason", leaveData.reason);

      if (leaveData.photoPath) {
        const rawName = leaveData.photoPath.split('/').pop() || 'photo.jpg';
        const hasExt = /\.\w{2,4}$/.test(rawName);
        const filename = hasExt ? rawName : `${rawName}.jpg`;
        formData.append('photo_path', { uri: leaveData.photoPath, name: filename, type: 'image/jpeg' });
      }

      const response = await fetch(`${BASE_URL}/api/leave/request-leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          const err = new TokenExpiredError(data.message || "Session expired. Please log in again.");
          triggerForceLogout();
          throw err;
        }
        throw new Error(data.message || 'Request leave failed');
      }
      return data;
    } catch (error) {
      console.error('Request Leave Error:', error);
      throw error;
    }
  },

  getMyLeaves: async () => {
    try {
      const response = await apiRequest(`/api/leave/my-leaves`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getLeaveSummary: async () => {
    try {
      const response = await apiRequest(`/api/leave/summary`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPendingLeaves: async () => {
    try {
      const response = await apiRequest(`/api/leave/pending`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  approveLeave: async (leaveId) => {
    try {
      const response = await apiRequest(`/api/leave/approve/${leaveId}`, { method: 'PUT' });
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectLeave: async (leaveId) => {
    try {
      const response = await apiRequest(`/api/leave/reject/${leaveId}`, { method: 'PUT' });
      return response;
    } catch (error) {
      throw error;
    }
  },

  cancelLeave: async (leaveId) => {
    try {
      const response = await apiRequest(`/api/leave/cancel/${leaveId}`, { method: 'PUT' });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Overtime Services
export const overtimeService = {
  getMyOvertimes: async () => {
    try {
      const response = await apiRequest(`/api/overtime/my-overtimes`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  requestOvertime: async (data) => {
    try {
      const response = await apiRequest(`/api/overtime/request-overtime`, {
        method: 'POST',
        body: data,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPendingOvertimes: async () => {
    try {
      const response = await apiRequest(`/api/overtime/pending`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  approveOvertime: async (overtimeId) => {
    try {
      const response = await apiRequest(`/api/overtime/approve/${overtimeId}`, {
        method: 'PUT',
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  rejectOvertime: async (overtimeId) => {
    try {
      const response = await apiRequest(`/api/overtime/reject/${overtimeId}`, {
        method: 'PUT',
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  cancelOvertime: async (overtimeId) => {
    try {
      const response = await apiRequest(`/api/overtime/cancel/${overtimeId}`, {
        method: 'PUT',
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Notification Services
export const notificationService = {
  getAll: async () => {
    try {
      const response = await apiRequest("/api/notification");
      return response;
    } catch (error) {
      throw error;
    }
  },

  markAllRead: async () => {
    try {
      const response = await apiRequest("/api/notification/read-all", {
        method: "PUT",
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  markRead: async (id) => {
    try {
      const response = await apiRequest(`/api/notification/${id}/read`, {
        method: "PUT",
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Document Services
export const documentService = {
  // Get active document types
  getDocumentTypes: async () => {
    try {
      const response = await apiRequest("/api/document/get-document-type?limit=100");
      return response;
    } catch (error) {
      console.error("Get document types error:", error);
      throw error;
    }
  },

  // Upload employee document
  uploadDocument: async (employeeId, documentTypeId, fileAsset) => {
    try {
      const { token } = await getStoredAuthState();
      const formData = new FormData();
      formData.append("document_type_id", String(documentTypeId));

      if (fileAsset && fileAsset.uri) {
        const rawName = fileAsset.name || fileAsset.fileName || fileAsset.uri.split('/').pop() || 'document.jpg';
        const type = fileAsset.mimeType || fileAsset.type || (rawName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
        formData.append("document", {
          uri: fileAsset.uri,
          name: rawName,
          type: type,
        });
      }

      const response = await fetch(`${BASE_URL}/api/employee/upload-document/${employeeId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Failed to upload document");
      }

      // Refresh profile data
      await authService.getProfile().catch(() => {});
      return resData;
    } catch (error) {
      console.error("Upload document error:", error);
      throw error;
    }
  },

  // Delete employee document
  deleteDocument: async (documentId) => {
    try {
      const response = await apiRequest(`/api/employee/delete-document/${documentId}`, {
        method: "DELETE",
      });

      // Refresh profile data
      await authService.getProfile().catch(() => {});
      return response;
    } catch (error) {
      console.error("Delete document error:", error);
      throw error;
    }
  },

  // Get employee documents
  getEmployeeDocuments: async (employeeId) => {
    try {
      const response = await apiRequest(`/api/employee/get-employee/${employeeId}`);
      return response?.document || response?.data?.document || [];
    } catch (error) {
      console.error("Get employee documents error:", error);
      throw error;
    }
  },
};

// Scanner Services (AI Auto-Crop & Enhancement)
export const scannerService = {
  scanDocument: async (imageUri) => {
    try {
      const { token } = await getStoredAuthState();
      const formData = new FormData();
      const rawName = imageUri.split('/').pop() || 'photo.jpg';
      formData.append("image", {
        uri: imageUri,
        name: rawName,
        type: 'image/jpeg',
      });

      const response = await fetch(`${BASE_URL}/api/scanner/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("AI crop scan failed");
      }

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result.split(',')[1];
            const filename = `${FileSystem.cacheDirectory}scanned_${Date.now()}.jpg`;
            await FileSystem.writeAsStringAsync(filename, base64data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            resolve(filename);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("[Mobile Scanner] scanDocument error:", error);
      throw error;
    }
  },
};

// App Menu Services (Dynamic Home Menu Configuration)
export const appMenuService = {
  getMenus: async () => {
    try {
      return await apiRequest("/api/app-menu");
    } catch (error) {
      console.warn("[AppMenu] getMenus error:", error);
      return { success: false, data: [] };
    }
  },
};

// KPI Services (Performance Evaluation)
export const kpiService = {
  getMyKPI: async (year) => {
    return await apiRequest(`/api/kpi/my-evaluations${year ? `?year=${year}` : ""}`);
  },
  getTeamKPI: async (month, year) => {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);
    return await apiRequest(`/api/kpi/team?${params.toString()}`);
  },
  submitKPI: async (payload) => {
    return await apiRequest("/api/kpi/evaluate", {
      method: "POST",
      body: payload,
    });
  },
};

export default {
  authService,
  attendanceService,
  overtimeService,
  timeModeService,
  timeSheetService,
  dayOfWeekService,
  employeeWorkingProfileService,
  leaveService,
  notificationService,
  documentService,
  scannerService,
  appMenuService,
  kpiService,
};

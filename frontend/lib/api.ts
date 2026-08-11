import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/);
    const token = match ? decodeURIComponent(match[1]) : localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Purge client-side cookies and storage immediately
        document.cookie = "auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "auth_token=; path=/; domain=" + window.location.hostname + "; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");

        // Redirect to login only if not already on the login page
        if (!window.location.pathname.includes("/login")) {
          const locale = window.location.pathname.match(/^\/(km|en)/)?.[1] || "en";
          window.location.href = `/${locale}/login?logout=true&expired=true`;
        }
      }
    }
    return Promise.reject(error);
  }
);

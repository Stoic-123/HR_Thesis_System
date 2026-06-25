"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Fetch notifications on mount
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notification");
      if (res.data && res.data.result) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark a notification as read
  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notification/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Handle incoming real-time notification
  const handleNewNotification = useCallback((notif: Notification) => {
    setNotifications((prev) => [notif, ...prev]);
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 1000);
    
    // Play custom premium toast alert
    toast(notif.title, {
      description: notif.body,
      action: {
        label: "Mark Read",
        onClick: () => markAsRead(notif.id),
      },
    });
  }, []);

  // Initialize socket hook
  useSocket(handleNewNotification);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      await api.put("/api/notification/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = () => setIsOpen(false);
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Bell Button */}
      <motion.button
        animate={shouldShake ? {
          rotate: [0, -15, 15, -15, 15, 0],
          scale: [1, 1.1, 1.1, 1.1, 1]
        } : {}}
        transition={{ duration: 0.5 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-muted-foreground transition-colors hover:text-primary hover:border-primary/40 focus:outline-none cursor-pointer"
        type="button"
        aria-label="Notifications"
      >
        <Bell className="size-4.5" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-88 overflow-hidden rounded-3xl border border-white/40 bg-white p-4 shadow-2xl backdrop-blur-2xl z-50 origin-top-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Notifications</h3>
                <p className="text-[11px] text-gray-500">{unreadCount} unread messages</p>
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-gray-50 p-3 mb-3">
                    <Inbox className="size-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">No notifications yet</p>
                  <p className="text-xs text-gray-400 max-w-[200px] mt-1">We will notify you when things require your attention.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) markAsRead(notif.id);
                    }}
                    className={`group relative flex flex-col p-3 rounded-2xl transition-all cursor-pointer border ${
                      notif.is_read
                        ? "bg-transparent border-transparent hover:bg-gray-50/50"
                        : "bg-primary/5 border-primary/10 hover:bg-primary/8 hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs transition-colors ${
                        notif.is_read ? "text-gray-700 font-medium" : "text-gray-950 font-bold"
                      }`}>
                        {notif.title}
                      </span>
                      
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    
                    <p className={`text-xs mt-1 leading-relaxed ${
                      notif.is_read ? "text-gray-500" : "text-gray-800"
                    }`}>
                      {notif.body}
                    </p>
                    
                    <span className="text-[10px] text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>

                    {/* Quick read mark button */}
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        className="absolute right-2 bottom-2 p-1 rounded-lg bg-white shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 text-gray-500 hover:text-primary cursor-pointer"
                        title="Mark as read"
                        type="button"
                      >
                        <Check className="size-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

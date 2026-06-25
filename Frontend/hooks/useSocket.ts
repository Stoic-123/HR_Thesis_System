import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useMe } from "@/hooks/useMe";

export const useSocket = (onNotification: (notif: any) => void) => {
  const { data: user } = useMe();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend");
    });

    socket.on("notification:received", (notif: any) => {
      onNotification(notif);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, onNotification]);

  return socketRef.current;
};

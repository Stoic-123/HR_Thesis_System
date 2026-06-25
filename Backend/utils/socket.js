import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

let io;
const userSockets = new Map(); // maps userId (number) to Set of socket IDs

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all origins or match Express CORS logic
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // Socket middleware for authorization
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (token && token.startsWith("Bearer ")) {
        token = token.slice(7);
      }
      
      // Fallback to parse cookies
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie.split(';').map(c => {
            const parts = c.trim().split('=');
            return [parts[0], parts.slice(1).join('=')];
          })
        );
        token = cookies.auth_token;
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          employee: {
            select: {
              id: true,
              company_id: true,
            }
          }
        }
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = {
        id: user.id,
        employee_id: user.employee?.id,
        company_id: user.employee?.company_id
      };
      
      next();
    } catch (err) {
      console.error("[Socket Auth Error]", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
    console.log(`[Socket] User ${userId} (Socket: ${socket.id}) connected`);

    // Join personal user-specific room
    socket.join(`user:${userId}`);
    
    // Join company room
    if (socket.user.company_id) {
      socket.join(`company:${socket.user.company_id}`);
    }

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} (Socket: ${socket.id}) disconnected`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Send real-time notification to a specific user
export const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification:received", notification);
    console.log(`[Socket] Dispatched real-time notification to user:${userId}`);
  }
};

// Send real-time notification to a company (all employees in the company)
export const sendNotificationToCompany = (companyId, notification) => {
  if (io) {
    io.to(`company:${companyId}`).emit("notification:received", notification);
    console.log(`[Socket] Dispatched real-time notification to company:${companyId}`);
  }
};

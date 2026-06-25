import prisma from "../lib/prisma.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { to_user_id: userId },
      orderBy: { created_at: "desc" },
      take: 50
    });
    res.status(200).json({ result: true, data: notifications });
  } catch (error) {
    console.error("[Notification Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { to_user_id: userId, is_read: false },
      data: { is_read: true }
    });
    res.status(200).json({ result: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("[Notification Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await prisma.notification.updateMany({
      where: { id: parseInt(id), to_user_id: userId },
      data: { is_read: true }
    });
    
    res.status(200).json({ result: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("[Notification Controller] Error:", error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

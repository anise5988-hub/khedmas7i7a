export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "SYSTEM";

export type StoredNotification = {
  id: string;
  userId: string | null; // null = all users or role broadcast
  role?: "STUDENT" | "TEACHER" | "ADMIN" | null;
  title: string;
  message: string;
  type: NotificationType;
  readBy: string[]; // user IDs who marked this notification as read
  createdAt: Date;
  link?: string | null;
};

const globalStore = globalThis as unknown as {
  __profyspace_notifications?: StoredNotification[];
};

if (!globalStore.__profyspace_notifications) {
  globalStore.__profyspace_notifications = [];
}

export const notificationsStore = {
  getUserNotifications(userId: string, userRole?: string): { notifications: Array<StoredNotification & { read: boolean }>; unreadCount: number } {
    const list = (globalStore.__profyspace_notifications || [])
      .filter((n) => {
        if (n.userId && n.userId !== userId) return false;
        if (n.role && userRole && n.role !== userRole) return false;
        return true;
      })
      .map((n) => {
        const isRead = n.readBy.includes(userId);
        return {
          ...n,
          read: isRead,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unreadCount = list.filter((n) => !n.read).length;
    return { notifications: list, unreadCount };
  },

  markAsRead(userId: string, notificationId?: string) {
    const list = globalStore.__profyspace_notifications || [];
    list.forEach((n) => {
      if (!notificationId || n.id === notificationId) {
        if (!n.readBy.includes(userId)) {
          n.readBy.push(userId);
        }
      }
    });
  },

  addNotification(data: {
    userId?: string | null;
    role?: "STUDENT" | "TEACHER" | "ADMIN" | null;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string | null;
  }) {
    const newNotif: StoredNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId || null,
      role: data.role || null,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      readBy: [],
      createdAt: new Date(),
      link: data.link || null,
    };

    globalStore.__profyspace_notifications!.unshift(newNotif);
    return newNotif;
  },
};

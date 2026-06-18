import { axiosConfig } from "../axios-config";

const url = "notifications";

export interface NotificationItem {
  id: string;
  createdAt: string;
  module: string;
  actor: string;
  actorEmail?: string;
  message: string;
  entityId?: string;
  subsidiaryId?: string;
  ip?: string;
  device?: string;
  location?: string;
  read: boolean;
  kind: "operation" | "session";
}

export interface NotificationFeed {
  items: NotificationItem[];
  unreadCount: number;
  lastReadAt: string | null;
}

export const getNotifications = async (limit = 30): Promise<NotificationFeed> => {
  const res = await axiosConfig.get(url, { params: { limit } });
  return res.data;
};

export const markNotificationsRead = async (): Promise<{ ok: boolean }> => {
  const res = await axiosConfig.post(`${url}/mark-read`);
  return res.data;
};

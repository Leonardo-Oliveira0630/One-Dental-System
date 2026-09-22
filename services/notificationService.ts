import { db } from './firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  arrayUnion,
  getDocs
} from 'firebase/firestore';
import { AppNotification, NotificationPreferences, PermissionKey, User, UserRole } from '../types';

const logger = {
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  info: (...args: any[]) => console.info(...args)
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  pushEnabled: true,
  dentistMessages: true,
  managerAlerts: true,
  webOrders: true,
  onlineRequisitions: true,
  jobStatusChanges: true
};

/**
 * Synthesizes a clean, pleasant notification chime using Web Audio API.
 * No external MP3 downloads required - zero latency and works offline on iOS & Android.
 */
export const playNotificationChime = (urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (urgency === 'URGENT' || urgency === 'HIGH') {
      // High urgency 3-note alert tone (A5 -> C#6 -> E6)
      const notes = [880, 1108.73, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } else {
      // Pleasant, gentle 2-note chime (F#5 -> B5) for standard notifications
      const notes = [739.99, 987.77];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0, now + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.4);
      });
    }
  } catch (err) {
    logger.warn(`[NotificationService] Audio playback skipped: ${err}`);
  }
};

/**
 * Checks platform capabilities for native Web Push and PWA notifications.
 */
export const checkPushSupport = () => {
  const isNotificationSupported = 'Notification' in window;
  const isServiceWorkerSupported = 'serviceWorker' in navigator;
  const isPushManagerSupported = 'PushManager' in window;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const permission = isNotificationSupported ? Notification.permission : 'denied';

  return {
    isNotificationSupported,
    isServiceWorkerSupported,
    isPushManagerSupported,
    isStandalone,
    isIOS,
    permission,
    isReadyForPush: isNotificationSupported && permission === 'granted'
  };
};

/**
 * Requests permission for Push Notifications and registers Service Worker if possible.
 */
export const requestPushNotificationPermission = async (): Promise<'granted' | 'denied' | 'default'> => {
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (swErr) {
          logger.warn(`[NotificationService] ServiceWorker registration notice: ${swErr}`);
        }
      }
    }
    return permission;
  } catch (err) {
    logger.error({ err }, '[NotificationService] Error requesting notification permission');
    return 'denied';
  }
};

/**
 * Fires a system/PWA notification via ServiceWorker or window.Notification.
 */
export const showSystemNotification = async (title: string, options: NotificationOptions & { data?: any }) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: '/logo labprox.svg',
          badge: '/logo labprox.svg',
          ...options,
          ...({ vibrate: [150, 80, 150] } as any)
        });
        return;
      }
    }
    
    new Notification(title, {
      icon: '/logo labprox.svg',
      ...options
    });
  } catch (err) {
    logger.warn(`[NotificationService] Fallback system notification notice: ${err}`);
  }
};

/**
 * CRITICAL RBAC LOGIC:
 * Evaluates whether a specific User profile is permitted to receive a notification.
 * Strictly respects PermissionKey, UserRole, targeted sectors, and targeted user IDs.
 */
export const canUserReceiveNotification = (user: User | null | undefined, notification: AppNotification): boolean => {
  if (!user) return false;

  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const isAdmin = user.role === UserRole.ADMIN || isSuperAdmin;
  const isClient = user.role === UserRole.CLIENT;

  // 1. If notification is specifically addressed to a particular user ID
  if (notification.userId) {
    return notification.userId === user.id;
  }

  // 2. Organization check: must match the user's organization (except for super admin)
  if (!isSuperAdmin && notification.organizationId && user.organizationId && notification.organizationId !== user.organizationId) {
    return false;
  }

  // 3. Target Role constraint (e.g., only CLIENTs or only ADMIN/MANAGER)
  if (notification.targetRole && notification.targetRole.length > 0) {
    if (!notification.targetRole.includes(user.role)) {
      return false;
    }
  }

  // 4. Target Sector constraint (e.g., Gesso, Metal, Cad/Cam, Acabamento, etc.)
  if (notification.targetSector) {
    const userSectors = [
      user.sector,
      ...(user.sectors || [])
    ].filter(Boolean);

    // Admins and managers can monitor all sectors, but regular collaborators must belong to the target sector
    if (!isAdmin && user.role !== UserRole.MANAGER) {
      if (!userSectors.includes(notification.targetSector)) {
        return false;
      }
    }
  }

  // 5. REQUIRED PERMISSION CHECK (PermissionKey)
  // For example:
  // - ONLINE_REQUISITION requires 'clients:view' or 'jobs:view'
  // - WEB_ORDER requires 'catalog:view' or 'jobs:view'
  // - MANAGER_ALERT requires 'jobs:alert' or general access
  if (notification.requiredPermission) {
    if (isAdmin) return true;
    const userPerms = user.permissions || [];
    if (!userPerms.includes(notification.requiredPermission)) {
      return false;
    }
  }

  // Type-specific permission fallbacks for lab collaborators
  if (!isClient && !isAdmin) {
    if (notification.type === 'ONLINE_REQUISITION') {
      const userPerms = user.permissions || [];
      const hasRequisitionAccess = userPerms.includes('clients:view') || userPerms.includes('jobs:view');
      if (!hasRequisitionAccess) return false;
    }

    if (notification.type === 'WEB_ORDER') {
      const userPerms = user.permissions || [];
      const hasOrderAccess = userPerms.includes('catalog:view') || userPerms.includes('jobs:view') || userPerms.includes('logistics:view');
      if (!hasOrderAccess) return false;
    }
  }

  return true;
};

// --- FIRESTORE SUBSCRIPTIONS & API ---

const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val?.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Subscribes to real-time notifications for an organization and user.
 */
export const subscribeUserNotifications = (
  orgId: string, 
  userId: string, 
  cb: (notifications: AppNotification[]) => void
) => {
  if (!db || !orgId) return () => {};

  const notifRef = collection(db, `organizations/${orgId}/notifications`);
  const q = query(
    notifRef,
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(q, (snap) => {
    const list: AppNotification[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const readBy: string[] = data.readBy || [];
      const isRead = data.read === true || readBy.includes(userId);

      return {
        id: docSnap.id,
        organizationId: data.organizationId || orgId,
        userId: data.userId || null,
        targetSector: data.targetSector || null,
        targetRole: data.targetRole || null,
        requiredPermission: data.requiredPermission || null,
        type: data.type || 'SYSTEM',
        title: data.title || 'Notificação',
        body: data.body || '',
        data: data.data || {},
        read: isRead,
        readBy: readBy,
        createdAt: toDate(data.createdAt),
        senderName: data.senderName,
        senderId: data.senderId,
        urgency: data.urgency || 'NORMAL'
      } as AppNotification;
    });

    cb(list);
  }, (err) => {
    logger.warn(`[Firestore] Error in subscribeUserNotifications for ${orgId}: ${err.message}`);
  });
};

/**
 * Subscribes to direct user notifications (for multi-lab dentists or private user inbox).
 */
export const subscribeDirectUserNotifications = (
  userId: string,
  cb: (notifications: AppNotification[]) => void
) => {
  if (!db || !userId) return () => {};

  const notifRef = collection(db, `users/${userId}/notifications`);
  const q = query(
    notifRef,
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(q, (snap) => {
    const list: AppNotification[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        organizationId: data.organizationId || '',
        userId: userId,
        targetSector: null,
        targetRole: null,
        requiredPermission: null,
        type: data.type || 'SYSTEM',
        title: data.title || 'Notificação',
        body: data.body || '',
        data: data.data || {},
        read: !!data.read,
        createdAt: toDate(data.createdAt),
        senderName: data.senderName,
        senderId: data.senderId,
        urgency: data.urgency || 'NORMAL'
      } as AppNotification;
    });

    cb(list);
  }, (err) => {
    logger.warn(`[Firestore] Error in subscribeDirectUserNotifications for ${userId}: ${err.message}`);
  });
};

/**
 * Creates and dispatches a notification to Firestore.
 */
export const apiCreateNotification = async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }) => {
  if (!db) return;
  const notifId = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const orgId = notification.organizationId;

  const payload = {
    ...notification,
    id: notifId,
    read: false,
    readBy: [],
    createdAt: new Date()
  };

  try {
    if (orgId) {
      await setDoc(doc(db, `organizations/${orgId}/notifications`, notifId), payload);
    }
    if (notification.userId) {
      await setDoc(doc(db, `users/${notification.userId}/notifications`, notifId), payload);
    }
  } catch (err) {
    logger.error({ err }, `[NotificationService] Error creating notification ${notifId}`);
  }
};

/**
 * Marks a single notification as read by a user.
 */
export const apiMarkNotificationAsRead = async (orgId: string, notifId: string, userId: string) => {
  if (!db) return;
  try {
    if (orgId) {
      const notifRef = doc(db, `organizations/${orgId}/notifications`, notifId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(userId)
      });
    }
    if (userId) {
      const userNotifRef = doc(db, `users/${userId}/notifications`, notifId);
      await updateDoc(userNotifRef, {
        read: true,
        readAt: new Date()
      }).catch(() => {});
    }
  } catch (err) {
    logger.warn(`[NotificationService] Error marking notification as read: ${err}`);
  }
};

/**
 * Marks all notifications as read.
 */
export const apiMarkAllNotificationsAsRead = async (orgId: string, userId: string, notifIds: string[]) => {
  if (!db || !notifIds.length) return;
  try {
    const promises = notifIds.map(id => apiMarkNotificationAsRead(orgId, id, userId));
    await Promise.all(promises);
  } catch (err) {
    logger.warn(`[NotificationService] Error marking all notifications as read: ${err}`);
  }
};

/**
 * Deletes a notification from Firestore.
 */
export const apiDeleteNotification = async (orgId: string, notifId: string, userId?: string) => {
  if (!db) return;
  try {
    if (orgId) {
      await deleteDoc(doc(db, `organizations/${orgId}/notifications`, notifId));
    }
    if (userId) {
      await deleteDoc(doc(db, `users/${userId}/notifications`, notifId)).catch(() => {});
    }
  } catch (err) {
    logger.warn(`[NotificationService] Error deleting notification: ${err}`);
  }
};

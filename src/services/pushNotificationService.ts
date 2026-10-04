import { getAuthHeaders } from './apiService';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isIOSWithoutPWA: boolean;
}

export async function checkPushSupport(): Promise<PushStatus> {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      permission: 'default',
      isSubscribed: false,
      isIOSWithoutPWA: false,
    };
  }

  const isIOS =
    /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  // On iOS, Web Push is ONLY supported in iOS 16.4+ after being added to Home Screen (PWA mode)
  const isIOSWithoutPWA = isIOS && !isStandalone;

  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  if (!isSupported) {
    return {
      isSupported: false,
      permission: 'default',
      isSubscribed: false,
      isIOSWithoutPWA,
    };
  }

  const permission = Notification.permission;
  let isSubscribed = false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    isSubscribed = Boolean(sub);
  } catch {}

  return {
    isSupported: true,
    permission,
    isSubscribed,
    isIOSWithoutPWA,
  };
}

export async function subscribeToWebPush(options?: {
  userId?: string;
  projectId?: string;
}): Promise<{ success: boolean; error?: string; reason?: 'denied' | 'unsupported' | 'ios_pwa_required' | 'network' }> {
  const status = await checkPushSupport();

  if (status.isIOSWithoutPWA) {
    return {
      success: false,
      error: 'Untuk iPhone/iPad, silakan Tambahkan ke Layar Utama terlebih dahulu untuk mengaktifkan notifikasi.',
      reason: 'ios_pwa_required',
    };
  }

  if (!status.isSupported) {
    return {
      success: false,
      error: 'Peramban web ini belum mendukung Web Push Notifications.',
      reason: 'unsupported',
    };
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      success: false,
      error: 'Izin notifikasi ditolak. Buka pengaturan izin situs di browser Anda untuk mengizinkan notifikasi.',
      reason: 'denied',
    };
  }

  try {
    // 2. Fetch server VAPID public key
    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) {
      throw new Error('Gagal mengambil kunci VAPID publik dari server');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      throw new Error('Kunci publik VAPID kosong');
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 3. Register or retrieve push subscription
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 4. Send subscription to server
    const subJson = subscription.toJSON();
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
        projectId: options?.projectId,
        userId: options?.userId,
      }),
    });

    if (!saveRes.ok) {
      throw new Error('Gagal menyimpan langganan notifikasi ke basis data server');
    }

    return { success: true };
  } catch (err: any) {
    console.error('[WebPush] Subscription error:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan saat mengaktifkan notifikasi push.',
      reason: 'network',
    };
  }
}

export async function unsubscribeFromWebPush(): Promise<{ success: boolean; error?: string }> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Inform server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal membatalkan langganan notifikasi' };
  }
}

export async function triggerTestPushNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Server menolak pengiriman notifikasi uji');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengirim notifikasi uji' };
  }
}

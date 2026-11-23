import { storage } from './storage.ts';

export interface TelegramSendResult {
  ok: boolean;
  simulated?: boolean;
  description?: string;
  messageId?: number;
}

export interface TelegramServerStatus {
  ok: boolean;
  configured: boolean;
  maskedToken: string;
  botUsername: string;
  chatId: string;
  source: 'env' | 'runtime' | 'none';
}

export interface TelegramChatCandidate {
  id: string;
  title: string;
  type: string;
  username?: string;
}

/**
 * Fetch server-side Telegram Bot status (never receives raw token)
 */
export async function getTelegramServerStatus(): Promise<TelegramServerStatus | null> {
  try {
    const res = await fetch('/api/telegram/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Save Telegram Bot config securely to backend runtime memory
 */
export async function saveTelegramServerConfig(payload: {
  botUsername?: string;
  chatId?: string;
  botToken?: string;
}): Promise<{ ok: boolean; status?: TelegramServerStatus; error?: string }> {
  try {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'មិនអាចរក្សាទុកការកំណត់ Bot បានទេ' };
    }
    return { ok: true, status: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'កំហុសបណ្តាញតភ្ជាប់ទៅកាន់ Server' };
  }
}

/**
 * Verify Telegram Bot connection via server proxy (/api/telegram/getMe)
 */
export async function verifyTelegramBot(botToken?: string): Promise<{
  ok: boolean;
  result?: any;
  description?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/telegram/getMe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botToken ? { botToken: botToken.trim() } : {}),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err?.message || 'កំហុសបណ្តាញតភ្ជាប់ Telegram API' };
  }
}

/**
 * Fetch recent chat IDs via server proxy (/api/telegram/getUpdates)
 */
export async function fetchTelegramRecentChats(botToken?: string): Promise<{
  ok: boolean;
  chats: TelegramChatCandidate[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/telegram/getUpdates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botToken ? { botToken: botToken.trim() } : {}),
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.chats)) {
      return { ok: true, chats: data.chats };
    }
    return { ok: false, chats: [], error: data.error || data.description };
  } catch (err: any) {
    return { ok: false, chats: [], error: err?.message || 'កំហុសបណ្តាញ' };
  }
}

/**
 * Trigger a native Desktop OS Notification when supported & permitted
 */
export function triggerDesktopNotification(title: string, body: string): void {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission === 'granted') {
      new window.Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
    }
  } catch {
    // Ignore notification errors in restricted iframes
  }
}

/**
 * Sends a real-time message via the school's server-side Telegram Bot proxy
 * and logs it to internal notification records.
 */
export async function sendTelegramAlert(
  message: string,
  targetChatId?: string,
  options?: { parseMode?: 'HTML'; skipLog?: boolean }
): Promise<TelegramSendResult> {
  try {
    const settings = storage.getTelegramSettings();
    const destChatId = (targetChatId || settings.chatId || '8069577143').trim();

    if (!options?.skipLog) {
      storage.addNotification({
        type: 'telegram',
        recipientName: 'អាណាព្យាបាល / Telegram Channel',
        recipientPhone: destChatId || '-',
        studentName: 'សិស្សវិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់',
        title: 'ដំណឹង Telegram ស្វ័យប្រវត្តិ',
        message: message.replace(/<[^>]*>/g, ''),
        status: 'sent',
      });
    }

    const response = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: destChatId,
        message,
        parseMode: options?.parseMode,
      }),
    });

    const data = await response.json();

    if (data.ok && !data.simulated) {
      triggerDesktopNotification(
        'វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់ · Telegram',
        message.replace(/<[^>]*>/g, '').slice(0, 140)
      );
    }

    return {
      ok: Boolean(data.ok),
      simulated: Boolean(data.simulated),
      description: data.description || data.message || data.error,
      messageId: data.result?.message_id,
    };
  } catch (error: any) {
    console.warn('Telegram send failed:', error);
    return {
      ok: false,
      description: error?.message || 'កំហុសបណ្តាញតភ្ជាប់ Telegram API',
    };
  }
}

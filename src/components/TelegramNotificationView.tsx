import React, { useState, useEffect } from 'react';
import {
  Send,
  Bell,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Bot,
  ExternalLink,
  Settings,
  RefreshCw,
  Key,
  ShieldCheck,
  Zap,
  Monitor,
  BellRing,
} from 'lucide-react';
import { NotificationItem, Student, SchoolClass } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import {
  getTelegramServerStatus,
  saveTelegramServerConfig,
  verifyTelegramBot,
  fetchTelegramRecentChats,
  sendTelegramAlert,
  TelegramServerStatus,
} from '../services/telegram.ts';

interface TelegramNotificationViewProps {
  notifications: NotificationItem[];
  students: Student[];
  classes: SchoolClass[];
  onRefresh: () => void;
}

export const TelegramNotificationView: React.FC<TelegramNotificationViewProps> = ({
  notifications,
  students,
  classes,
  onRefresh,
}) => {
  const currentSettings = storage.getTelegramSettings();

  const [botUsername, setBotUsername] = useState(currentSettings.botUsername || '@stschoolsystem_bot');
  const [botTokenInput, setBotTokenInput] = useState('');
  const [chatId, setChatId] = useState(currentSettings.chatId || '8069577143');
  const [serverStatus, setServerStatus] = useState<TelegramServerStatus | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Desktop Notification Permission State
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'unsupported';
  });

  // Bot Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    botInfo?: any;
  }>({
    status: 'idle',
    message: '',
  });

  // Recent chats from getUpdates
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [recentChats, setRecentChats] = useState<Array<{ id: string; title: string; type: string }>>([]);

  // Test send state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '__custom__');
  const [testReason, setTestReason] = useState<string>('អវត្តមានឥតច្បាប់ ម៉ោងទី ១');
  const [customChatId, setCustomChatId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Sync server Telegram status and auto-verify on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const status = await getTelegramServerStatus();
      if (!active || !status) return;
      setServerStatus(status);
      if (status.botUsername) setBotUsername(status.botUsername);
      if (status.chatId) setChatId(status.chatId);
      if (status.configured) {
        await handleVerifyBot();
      } else {
        setIsEditingSettings(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleEnableDesktopNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await window.Notification.requestPermission();
      setDesktopNotifPermission(result);
      if (result === 'granted') {
        new window.Notification('វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់', {
          body: 'ការជូនដំណឹងលើអេក្រង់កុំព្យូទ័រត្រូវបានបើកដំណើរការដោយជោគជ័យ!',
          icon: './pwa-192x192.png',
        });
      }
    } catch {
      // Ignore restricted environments
    }
  };

  const handleVerifyBot = async (overrideToken?: string) => {
    setIsVerifying(true);
    setVerifyResult({ status: 'idle', message: '' });

    try {
      const data = await verifyTelegramBot(overrideToken);
      if (data.ok && data.result) {
        const cleanUser = data.result.username ? `@${data.result.username}` : botUsername;
        setVerifyResult({
          status: 'success',
          message: `Bot ភ្ជាប់ជោគជ័យ៖ ${data.result.first_name} (${cleanUser}) · Bot ID: ${data.result.id}`,
          botInfo: data.result,
        });
        if (data.result.username) {
          setBotUsername(`@${data.result.username}`);
        }
      } else {
        setVerifyResult({
          status: 'error',
          message:
            data.description ||
            data.error ||
            'មិនទាន់បានកំណត់ TELEGRAM_BOT_TOKEN នៅលើ Server ឬ Token មិនត្រឹមត្រូវ',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        status: 'error',
        message: err?.message || 'កំហុសបណ្តាញតភ្ជាប់ Telegram API',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFetchRecentChats = async () => {
    setIsFetchingChats(true);
    try {
      const res = await fetchTelegramRecentChats(botTokenInput.trim() || undefined);
      if (res.ok && res.chats.length > 0) {
        setRecentChats(res.chats);
        if (!chatId) {
          setChatId(res.chats[0].id);
        }
      }
    } finally {
      setIsFetchingChats(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsErrorMsg('');
    setSettingsSavedMsg('');

    const res = await saveTelegramServerConfig({
      botUsername: botUsername.trim() || '@stschoolsystem_bot',
      chatId: chatId.trim() || '8069577143',
      botToken: botTokenInput.trim() || undefined,
    });

    if (!res.ok) {
      setSettingsErrorMsg(res.error || 'មិនអាចរក្សាទុកការកំណត់បានទេ');
      return;
    }

    if (res.status) {
      setServerStatus(res.status);
    }

    // Store only non-secret public metadata in local storage
    storage.updateTelegramSettings({
      botUsername: botUsername.trim() || '@stschoolsystem_bot',
      chatId: chatId.trim() || '8069577143',
      isEnabled: true,
    });

    setBotTokenInput('');
    setSettingsSavedMsg('ការកំណត់ Telegram Bot ត្រូវបានរក្សាទុកលើ Server ដោយសុវត្ថិភាព!');
    setIsEditingSettings(false);
    await handleVerifyBot();
    onRefresh();
    setTimeout(() => setSettingsSavedMsg(''), 4000);
  };

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    const targetClass = student ? classes.find((c) => c.id === student.classId) : undefined;
    const className = targetClass?.name || 'ថ្នាក់រៀន';
    const targetChatId = customChatId.trim() || chatId.trim() || '8069577143';

    const testMsg = student
      ? `🔔 <b>[វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់]</b>
<b>ដំណឹងអវត្តមានសិស្ស៖</b>
សូមជម្រាបជូនលោក/លោកស្រី <b>${student.parentName}</b> (${student.parentRelationship} របស់សិស្ស <b>${student.khmerName}</b> ថ្នាក់ <b>${className}</b>) ថាកូនរបស់លោក/លោកស្រីបាន «<b>${testReason}</b>» នៅថ្ងៃនេះ។
📍 សូមមេត្តាទាក់ទងមកកាន់លេខាធិការដ្ឋានសាលា ឬគ្រូប្រចាំថ្នាក់ដើម្បីបំភ្លឺ។ សូមអរគុណ!`
      : `🔔 <b>[វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់]</b>
<b>សារសាកល្បងប្រព័ន្ធ Telegram Bot (@stschoolsystem_bot)៖</b>
${testReason}
✅ ការតភ្ជាប់ប្រព័ន្ធគ្រប់គ្រងសាលារៀន (កុំព្យូទ័រ & ទូរស័ព្ទ) ដំណើរការធម្មតា!`;

    setIsSending(true);
    setSendFeedback({ type: null, message: '' });

    try {
      const result = await sendTelegramAlert(testMsg, targetChatId, {
        parseMode: 'HTML',
        skipLog: true,
      });

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        type: 'telegram',
        recipientName: student
          ? `${student.parentName} (${student.parentRelationship})`
          : `Telegram ID: ${targetChatId}`,
        recipientPhone: student?.parentPhone || targetChatId,
        studentName: student?.khmerName || 'សារសាកល្បងប្រព័ន្ធ',
        title: student ? `ដំណឹងអវត្តមាន - ${student.khmerName}` : 'សារសាកល្បង Telegram Bot',
        message: testMsg.replace(/<[^>]*>/g, ''),
        status: 'sent',
        sentAt: new Date().toISOString(),
      };

      storage.addNotification(newNotif, 'Telegram Bot');
      onRefresh();

      if (result.ok) {
        if (result.simulated) {
          setSendFeedback({
            type: 'success',
            message:
              result.description ||
              'សារត្រូវបានកត់ត្រាទុកក្នុងប្រព័ន្ធ! (សូមកំណត់ TELEGRAM_BOT_TOKEN ក្នុង Settings -> Secrets ឬបញ្ចូលក្នុងផ្ទាំង «កែប្រែ Bot» ដើម្បីផ្ញើចូល Telegram ផ្ទាល់)',
          });
        } else {
          setSendFeedback({
            type: 'success',
            message: `សារ Telegram ត្រូវបានបញ្ជូនទៅ ID ${targetChatId} ដោយជោគជ័យ! (Message ID: ${result.messageId || 'OK'})`,
          });
        }
      } else {
        setSendFeedback({
          type: 'error',
          message: `កំហុស Telegram: ${result.description || 'សូមពិនិត្យមើល Chat ID ឬចុច Start Bot ជាមុន'}`,
        });
      }
    } catch (err: any) {
      setSendFeedback({
        type: 'error',
        message: err?.message || 'កំហុសបណ្តាញ មិនអាចផ្ញើសារបានទេ',
      });
    } finally {
      setIsSending(false);
    }
  };

  const cleanHandle = (botUsername || '@stschoolsystem_bot').replace(/^@/, '');

  return (
    <div className="space-y-6">
      {/* Top Banner & Bot Info Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-moul text-slate-900 tracking-wide">
                  ប្រព័ន្ធ Telegram Bot ជូនដំណឹងវត្តមានសិស្ស
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់ · @{cleanHandle} · Default Chat ID: {chatId || '8069577143'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Open in Telegram Desktop (Computer) */}
            <a
              href={`tg://resolve?domain=${cleanHandle}`}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Monitor className="w-4 h-4 text-amber-300" />
              <span>បើកលើ Telegram កុំព្យូទ័រ</span>
            </a>

            {/* Open in Telegram Web / Mobile */}
            <a
              href={`https://t.me/${cleanHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Bot className="w-4 h-4 text-sky-600" />
              <span>បើក @{cleanHandle}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Desktop OS Notifications */}
            {desktopNotifPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={handleEnableDesktopNotifications}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  desktopNotifPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                }`}
              >
                <BellRing className="w-4 h-4" />
                <span>
                  {desktopNotifPermission === 'granted'
                    ? 'ដំណឹងកុំព្យូទ័រ៖ បើករួច'
                    : 'បើកដំណឹងលើកុំព្យូទ័រ'}
                </span>
              </button>
            )}

            {/* Edit / Config Toggle Button */}
            <button
              type="button"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>{isEditingSettings ? 'បិទការកំណត់' : 'កែប្រែ Bot'}</span>
            </button>
          </div>
        </div>

        {/* Status Verification Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-semibold text-slate-600">ស្ថានភាព Bot៖</span>
            {isVerifying ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>កំពុងផ្ទៀងផ្ទាត់ការតភ្ជាប់តាម Server Proxy...</span>
              </span>
            ) : verifyResult.status === 'success' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{verifyResult.message}</span>
              </span>
            ) : verifyResult.status === 'error' ? (
              <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{verifyResult.message}</span>
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px] font-semibold">
                រង់ចាំកំណត់ TELEGRAM_BOT_TOKEN (Settings → Secrets ឬបញ្ចូលខាងក្រោម)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleVerifyBot()}
            disabled={isVerifying}
            className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>ពិនិត្យឡើងវិញ (Refresh)</span>
          </button>
        </div>

        {/* Telegram Config Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">ឈ្មោះ Bot (Username)</span>
            <div className="text-xs font-mono font-bold text-sky-800 mt-1 flex items-center gap-1.5">
              <span>@{cleanHandle}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-sm ${
                  serverStatus?.configured
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {serverStatus?.configured ? 'Online' : 'Ready'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Chat ID គោលដៅ (Admin ID)</span>
            <div className="text-xs font-mono font-bold text-slate-800 mt-1">
              {chatId || '8069577143'}
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Server Bot Token</span>
            <div className="text-xs font-mono text-slate-700 truncate mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {serverStatus?.configured
                  ? serverStatus.maskedToken
                  : 'រង់ចាំកំណត់លើ Server'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">ចំនួនសារបានផ្ញើ</span>
            <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{notifications.length} សារ</span>
            </div>
          </div>
        </div>

        {/* Config Edit Panel (Collapsible) */}
        {isEditingSettings && (
          <div className="mt-5 p-4 bg-sky-50/50 rounded-2xl border border-sky-200">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-700" />
                <h3 className="text-xs font-bold text-slate-900">
                  កំណត់ការតភ្ជាប់ Telegram Bot (រក្សាទុក Token លើ Server ដោយសុវត្ថិភាព)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Server-Side Proxy Protected
              </span>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bot Username (@)
                  </label>
                  <input
                    type="text"
                    value={botUsername}
                    onChange={(e) => setBotUsername(e.target.value)}
                    placeholder="@stschoolsystem_bot"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-hidden font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Bot Token (ពី @BotFather · ផ្ញើទៅ Server ផ្ទាល់)
                  </label>
                  <input
                    type="password"
                    value={botTokenInput}
                    onChange={(e) => setBotTokenInput(e.target.value)}
                    placeholder={
                      serverStatus?.configured
                        ? 'បានកំណត់រួចលើ Server (ទុកទទេដើម្បីប្រើ Token បច្ចុប្បន្ន)'
                        : 'បញ្ចូល Bot Token របស់អ្នកនៅទីនេះ ឬកំណត់ TELEGRAM_BOT_TOKEN ក្នុង Secrets'
                    }
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Default Chat ID ឬ Group ID (សម្រាប់ទទួលសារ)
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchRecentChats}
                    disabled={isFetchingChats}
                    className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingChats ? 'animate-spin' : ''}`} />
                    <span>ស្វែងរក Chat ID ស្វ័យប្រវត្ត</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="8069577143"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 ដើម្បីឱ្យ Bot ដំណើរការជាប់ជានិច្ចគ្រប់ពេលបើកម៉ាស៊ីន សូមបន្ថែម <b>TELEGRAM_BOT_TOKEN</b> នៅក្នុង AI Studio <b>Settings → Secrets</b> ឬបញ្ចូល Token នៅប្រអប់ខាងលើរួចចុច «រក្សាទុកការកំណត់»។
                </p>

                {recentChats.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700">Chat IDs ដែលបានរកឃើញថ្មីៗ៖</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {recentChats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setChatId(c.id)}
                          className="px-2 py-0.5 text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-900 rounded font-mono cursor-pointer"
                        >
                          {c.title} ({c.id})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {settingsErrorMsg && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settingsErrorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  រក្សាទុកការកំណត់
                </button>
              </div>
            </form>
          </div>
        )}

        {settingsSavedMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{settingsSavedMsg}</span>
          </div>
        )}
      </div>

      {/* Grid: Test Alert Sender Card & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Alert Sender Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                ផ្ញើសារសាកល្បងទៅ Telegram
              </h3>
              <p className="text-[10px] text-slate-400">បញ្ជូនសារតាម @{cleanHandle} ទៅ ID {chatId || '8069577143'}</p>
            </div>
          </div>

          <form onSubmit={handleSendTestAlert} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ជ្រើសរើសសិស្ស ឬផ្ញើសារទូទៅ
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-hidden"
              >
                <option value="__custom__">📢 សារសាកល្បងទូទៅរបស់សាលា (មិនជ្រើសសិស្ស)</option>
                {students.map((s) => {
                  const c = classes.find((item) => item.id === s.classId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.khmerName} ({c?.name}) - អាណាព្យាបាល: {s.parentName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                មូលហេតុ / ខ្លឹមសារសារ
              </label>
              <input
                type="text"
                value={testReason}
                onChange={(e) => setTestReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Chat ID គោលដៅ (បើមិនដាក់ ប្រើ Default ID: {chatId || '8069577143'})
              </label>
              <input
                type="text"
                value={customChatId}
                onChange={(e) => setCustomChatId(e.target.value)}
                placeholder={chatId || '8069577143'}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-hidden font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSending ? 'កំពុងផ្ញើសារ...' : 'ផ្ញើសារទៅកាន់ Telegram'}</span>
              </button>
            </div>

            {sendFeedback.type && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  sendFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {sendFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">{sendFeedback.message}</div>
              </div>
            )}
          </form>

          {/* Quick instructions box */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>របៀបទទួលសារលើកុំព្យូទ័រ និងទូរស័ព្ទ៖</span>
            </div>
            <p>
              ១. ចុចបើក{' '}
              <a
                href={`https://t.me/${cleanHandle}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 font-bold underline"
              >
                @{cleanHandle}
              </a>{' '}
              លើ Telegram ទូរស័ព្ទ ឬ Telegram Desktop
            </p>
            <p>២. ចុចប៊ូតុង <b>Start</b> ដើម្បីអនុញ្ញាតឱ្យ Bot ផ្ញើសារមក ID <b>{chatId || '8069577143'}</b></p>
            <p>៣. កំណត់ <b>TELEGRAM_BOT_TOKEN</b> ក្នុង Settings → Secrets ដើម្បីការពារសុវត្ថិភាព Token</p>
          </div>
        </div>

        {/* Notification History Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs font-bold text-slate-900">
                ប្រវត្តិសារ Telegram ដែលបានបញ្ជូន ({notifications.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              @{cleanHandle} · ID: {chatId || '8069577143'}
            </span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                      <Send className="w-3 h-3" />
                    </span>
                    <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">
                    {new Date(notif.sentAt).toLocaleString('km-KH')}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed font-khmer whitespace-pre-line">
                  {notif.message}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">អ្នកទទួល៖</span>
                    <strong className="text-slate-800">{notif.recipientName}</strong>
                    <span>({notif.recipientPhone})</span>
                  </div>

                  <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>បញ្ជូនតាម Telegram Bot</span>
                  </span>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
                មិនទាន់មានប្រវត្តិសារជូនដំណឹងនៅឡើយទេ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

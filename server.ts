import 'dotenv/config';
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8')
);
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Isolated Firestore collections for Samdech Techo Hun Sen Stung Trang High School
const COLLECTIONS = {
  USERS: 'sths_users',
  STUDENTS: 'sths_students',
  CLASSES: 'sths_classes',
  ATTENDANCE: 'sths_attendanceRecords',
} as const;

// Initial fallback admin if database is freshly initiated
const DEFAULT_ROOT_ADMIN = {
  id: 'usr-admin',
  username: 'admin',
  password: 'Udom26',
  name: 'រដ្ឋបាល វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់',
  role: 'admin',
  email: 'admin@stungtranghs.edu.kh',
  phone: '',
  status: 'active',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  createdAt: '2025-10-01',
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS Middleware for Mobile and Desktop cross-origin requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // -------------------------------------------------------------
  // 3-Tier System Status & Health Check API
  // -------------------------------------------------------------
  app.get('/api/system/status', async (req, res) => {
    let dbStatus = 'connected';
    let dbError = null;
    try {
      await getDoc(doc(db, 'test', 'connection'));
    } catch (e: any) {
      if (e?.message && e.message.includes('the client is offline')) {
        dbStatus = 'offline';
        dbError = e.message;
      }
    }

    res.json({
      architecture: '3-Tier Full-Stack (Frontend + Backend API + Central Database)',
      frontend: {
        name: 'React SPA + Tailwind CSS + Mobile/Desktop Responsive',
        status: 'online',
      },
      backend: {
        name: 'Node.js Express REST API Server',
        port: PORT,
        status: 'online',
      },
      centralDatabase: {
        name: 'Google Firebase Firestore Cloud Database (Isolated STHS Namespace)',
        databaseId: 'sths-isolated-collections',
        status: dbStatus,
        error: dbError,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      school: 'វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់',
      system: 'Samdech Techo Hun Sen Stung Trang High School Management System',
      version: '5.0.0',
      database: 'Firebase Firestore Cloud Database Connected (STHS Isolated)',
      timestamp: new Date().toISOString(),
      platform: 'Full-Stack Express + React + Firebase Cloud DB',
    });
  });

  // -------------------------------------------------------------
  // Central Database User Management API Endpoints
  // -------------------------------------------------------------

  // 1. GET /api/users - Fetch all users from Central Database
  app.get('/api/users', async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
      const users: any[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data());
      });

      // Ensure root admin always exists
      if (!users.some((u) => u.username === 'admin')) {
        users.unshift(DEFAULT_ROOT_ADMIN);
        // Persist default admin to cloud database asynchronously
        setDoc(doc(db, COLLECTIONS.USERS, DEFAULT_ROOT_ADMIN.id), DEFAULT_ROOT_ADMIN).catch(() => {});
      }

      res.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (err: any) {
      console.warn('Backend /api/users read fallback:', err.message);
      res.json({
        success: true,
        count: 1,
        users: [DEFAULT_ROOT_ADMIN],
        note: 'Fallback to default admin',
      });
    }
  });

  // 2. POST /api/users - Create new user in Central Database
  app.post('/api/users', async (req, res) => {
    try {
      const { username, password, name, role, email, phone, avatar, status } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Username, password, and name are required',
        });
      }

      const userId = `usr-${Date.now()}`;
      const newUser = {
        id: userId,
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role: role || 'teacher',
        email: email ? email.trim() : `${username.trim()}@stungtranghs.edu.kh`,
        phone: phone || '',
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: status || 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };

      await setDoc(doc(db, COLLECTIONS.USERS, userId), newUser);

      res.status(201).json({
        success: true,
        message: 'អ្នកប្រើប្រាស់ត្រូវបានបង្កើតក្នុង Central Database ដោយជោគជ័យ',
        user: newUser,
      });
    } catch (err: any) {
      console.error('Error creating user in backend:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to create user in Central Database',
      });
    }
  });

  // 3. PUT /api/users/:id - Update user in Central Database
  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const userDocRef = doc(db, COLLECTIONS.USERS, id);
      const existingSnap = await getDoc(userDocRef);

      if (!existingSnap.exists()) {
        // If not found in cloud, create it
        const newUser = { id, ...updates };
        await setDoc(userDocRef, newUser);
        return res.json({
          success: true,
          message: 'បានកែប្រែព័ត៌មានអ្នកប្រើប្រាស់ជោគជ័យ',
          user: newUser,
        });
      }

      await updateDoc(userDocRef, updates);
      res.json({
        success: true,
        message: 'ព័ត៌មានត្រូវបានកែប្រែក្នុង Central Database ដោយជោគជ័យ',
      });
    } catch (err: any) {
      console.error('Error updating user:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to update user',
      });
    }
  });

  // 4. DELETE /api/users/:id - Delete user from Central Database
  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'usr-admin') {
        return res.status(403).json({
          success: false,
          error: 'មិនអាចលុបគណនី Root Admin បានទេ',
        });
      }

      await deleteDoc(doc(db, COLLECTIONS.USERS, id));
      res.json({
        success: true,
        message: 'បានលុបគណនីពី Central Database ដោយជោគជ័យ',
      });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to delete user',
      });
    }
  });

  // 5. GET /api/system/access-code - Get current shared universal system access code
  app.get('/api/system/access-code', (req, res) => {
    res.json({
      success: true,
      accessCode: DEFAULT_ROOT_ADMIN.password,
    });
  });

  // 6. PUT /api/system/access-code - Update shared universal access code for ALL users
  app.put('/api/system/access-code', async (req, res) => {
    try {
      const { accessCode } = req.body;
      if (!accessCode || accessCode.trim().length < 4) {
        return res.status(400).json({
          success: false,
          error: 'លេខកូដសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៤ តួអក្សរ',
        });
      }
      const newCode = accessCode.trim();
      DEFAULT_ROOT_ADMIN.password = newCode;

      // Update in cloud Firestore for all users (and ensure usr-admin exists)
      try {
        await setDoc(doc(db, COLLECTIONS.USERS, DEFAULT_ROOT_ADMIN.id), {
          ...DEFAULT_ROOT_ADMIN,
          password: newCode,
        });
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const updatePromises: Promise<any>[] = [];
        snapshot.forEach((docSnap) => {
          updatePromises.push(updateDoc(doc(db, COLLECTIONS.USERS, docSnap.id), { password: newCode }));
        });
        await Promise.allSettled(updatePromises);
      } catch (cloudErr) {
        console.warn('Could not update all cloud user passwords:', cloudErr);
      }

      res.json({
        success: true,
        message: 'លេខកូដសម្ងាត់រួមប្រព័ន្ធត្រូវបានផ្លាស់ប្ដូរសម្រាប់គ្រប់គណនីទាំងអស់ដោយជោគជ័យ',
        accessCode: newCode,
      });
    } catch (err: any) {
      console.error('Error updating system access code:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to update system access code',
      });
    }
  });

  // 7. POST /api/users/:id/reset-password - Password reset updates the single universal system code
  app.post('/api/users/:id/reset-password', async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.trim().length < 4) {
        return res.status(400).json({
          success: false,
          error: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៤ តួអក្សរ',
        });
      }

      const newCode = newPassword.trim();
      DEFAULT_ROOT_ADMIN.password = newCode;

      // Update in cloud Firestore for all users
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        const updatePromises: Promise<any>[] = [];
        snapshot.forEach((docSnap) => {
          updatePromises.push(updateDoc(doc(db, COLLECTIONS.USERS, docSnap.id), { password: newCode }));
        });
        await Promise.allSettled(updatePromises);
      } catch (cloudErr) {
        console.warn('Could not update all cloud user passwords on reset:', cloudErr);
      }

      res.json({
        success: true,
        message: 'លេខកូដសម្ងាត់រួមត្រូវបានផ្លាស់ប្ដូរក្នុង Central Database ដោយជោគជ័យសម្រាប់គ្រប់គណនីទាំងអស់',
        accessCode: newCode,
      });
    } catch (err: any) {
      console.error('Error resetting password:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to reset password',
      });
    }
  });

  // -------------------------------------------------------------
  // Central Multi-User State Synchronization API (/api/sync/state)
  // Ensures all Users across all accounts/browsers/tabs see identical attendance & school data
  // -------------------------------------------------------------
  let sharedServerState: Record<string, any> | null = null;

  app.get('/api/sync/state', async (req, res) => {
    try {
      // Also pull latest attendanceRecords from Firestore if sharedServerState is not yet populated
      if (!sharedServerState) {
        try {
          const [attSnap, stuSnap, clsSnap] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.ATTENDANCE)),
            getDocs(collection(db, COLLECTIONS.STUDENTS)),
            getDocs(collection(db, COLLECTIONS.CLASSES)),
          ]);
          const attList: any[] = [];
          attSnap.forEach((d) => attList.push(d.data()));
          const stuList: any[] = [];
          stuSnap.forEach((d) => stuList.push(d.data()));
          const clsList: any[] = [];
          clsSnap.forEach((d) => clsList.push(d.data()));

          if (attList.length > 0 || stuList.length > 0 || clsList.length > 0) {
            sharedServerState = {
              attendanceRecords: attList,
              students: stuList.length > 0 ? stuList : undefined,
              classes: clsList.length > 0 ? clsList : undefined,
              updatedAt: Date.now(),
            };
          }
        } catch {
          // Ignore cloud preload error
        }
      }

      res.json({
        success: true,
        state: sharedServerState,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync/state', async (req, res) => {
    try {
      const incoming = req.body || {};
      if (!sharedServerState) {
        sharedServerState = { ...incoming, updatedAt: Date.now() };
      } else {
        const deletedSet = new Set<string>([
          ...(Array.isArray(sharedServerState.deletedIds) ? sharedServerState.deletedIds : []),
          ...(Array.isArray(incoming.deletedIds) ? incoming.deletedIds : []),
        ]);

        // Merge attendanceRecords by id (excluding deleted records/students)
        const mergedAttMap = new Map<string, any>();
        for (const r of sharedServerState.attendanceRecords || []) {
          if (r && r.id && !deletedSet.has(r.id) && !deletedSet.has(r.studentId)) {
            mergedAttMap.set(r.id, r);
          }
        }
        for (const r of incoming.attendanceRecords || []) {
          if (r && r.id && !deletedSet.has(r.id) && !deletedSet.has(r.studentId)) {
            mergedAttMap.set(r.id, r);
          }
        }

        // Merge attendanceSessions by id
        const mergedSessMap = new Map<string, any>();
        for (const s of sharedServerState.attendanceSessions || []) {
          if (s && s.id) mergedSessMap.set(s.id, s);
        }
        for (const s of incoming.attendanceSessions || []) {
          if (s && s.id) mergedSessMap.set(s.id, s);
        }

        const filteredStudents = Array.isArray(incoming.students || sharedServerState.students)
          ? (incoming.students || sharedServerState.students).filter((s: any) => {
              if (!s) return false;
              const code = String(s.studentId || '').trim();
              const name = String(s.khmerName || '').trim();
              return !deletedSet.has(s.id) && !deletedSet.has(`stu_key:${code}_${name}`);
            })
          : undefined;

        const filteredClasses = Array.isArray(incoming.classes || sharedServerState.classes)
          ? (incoming.classes || sharedServerState.classes).filter((c: any) => {
              if (!c) return false;
              const normName = String(c.name || '').trim().replace(/\s+/g, ' ');
              return !deletedSet.has(c.id) && !deletedSet.has(`cls_name:${normName}`);
            })
          : undefined;

        sharedServerState = {
          ...sharedServerState,
          ...incoming,
          students: filteredStudents,
          classes: filteredClasses,
          attendanceRecords: Array.from(mergedAttMap.values()),
          attendanceSessions: Array.from(mergedSessMap.values()),
          deletedIds: Array.from(deletedSet),
          updatedAt: Date.now(),
        };
      }

      res.json({
        success: true,
        updatedAt: sharedServerState?.updatedAt || Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // School General Info & Secure Server-Side Telegram Bot Proxy
  // -------------------------------------------------------------
  const TELEGRAM_TOKEN_REGEX = /^\d{6,15}:[A-Za-z0-9_-]{20,120}$/;
  const TELEGRAM_CHAT_ID_REGEX = /^-?\d{5,20}$|^@[a-zA-Z0-9_]{5,32}$/;

  const normalizeBotUsername = (raw: string): string => {
    const cleaned = String(raw || '').trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
    return cleaned ? `@${cleaned}` : '@stschoolsystem_bot';
  };

  const maskTelegramToken = (token: string): string => {
    if (!token) return '';
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      return `${token.slice(0, colonIdx + 5)}••••••••••••••••••••`;
    }
    return `${token.slice(0, 8)}••••••••••••••••••••`;
  };

  const telegramRuntimeConfig = {
    botToken: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    botUsername: normalizeBotUsername(process.env.TELEGRAM_BOT_USERNAME || '@stschoolsystem_bot'),
    chatId: (process.env.TELEGRAM_CHAT_ID || '8069577143').trim(),
    source: (process.env.TELEGRAM_BOT_TOKEN || '').trim() ? ('env' as const) : ('none' as 'env' | 'runtime' | 'none'),
  };

  const resolveActiveTelegramToken = (providedToken?: unknown): string => {
    const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (envToken && TELEGRAM_TOKEN_REGEX.test(envToken)) {
      return envToken;
    }
    if (telegramRuntimeConfig.botToken && TELEGRAM_TOKEN_REGEX.test(telegramRuntimeConfig.botToken)) {
      return telegramRuntimeConfig.botToken;
    }
    const candidate = typeof providedToken === 'string' ? providedToken.trim() : '';
    if (candidate && TELEGRAM_TOKEN_REGEX.test(candidate)) {
      return candidate;
    }
    return '';
  };

  app.get('/api/school/info', (req, res) => {
    res.json({
      nameKm: 'វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់',
      nameEn: 'Samdech Techo Hun Sen Stung Trang High School',
      code: 'STHS-0712',
      academicYear: '២០២៥-២០២៦',
      location: 'ស្រុកស្ទឹងត្រង់ ខេត្តកំពង់ចាម',
      ministry: 'ក្រសួងអប់រំ យុវជន និងកីឡា',
      department: 'មន្ទីរអប់រំ យុវជន និងកីឡា ខេត្តកំពង់ចាម',
      office: 'ការិយាល័យអប់រំ យុវជន និងកីឡា ស្រុកស្ទឹងត្រង់',
      grades: ['ថ្នាក់ទី ៧', 'ថ្នាក់ទី ៨', 'ថ្នាក់ទី ៩', 'ថ្នាក់ទី ១០', 'ថ្នាក់ទី ១១', 'ថ្នាក់ទី ១២'],
      educationLevel: 'វិទ្យាល័យ (High School / Secondary Education)',
      contact: {
        phone: '',
        telegram: telegramRuntimeConfig.botUsername,
      },
    });
  });

  // 0. Get Telegram Bot Configuration Status (never returns raw token)
  app.get('/api/telegram/status', (req, res) => {
    const activeToken = resolveActiveTelegramToken();
    const envConfigured = Boolean((process.env.TELEGRAM_BOT_TOKEN || '').trim());
    res.json({
      ok: true,
      configured: Boolean(activeToken),
      maskedToken: maskTelegramToken(activeToken),
      botUsername: telegramRuntimeConfig.botUsername,
      chatId: telegramRuntimeConfig.chatId,
      source: envConfigured ? 'env' : activeToken ? 'runtime' : 'none',
    });
  });

  // 0b. Update Telegram Bot Config in server memory (keeps token off client localStorage)
  app.post('/api/telegram/config', (req, res) => {
    const { botUsername, chatId, botToken } = req.body || {};

    if (typeof botUsername === 'string' && botUsername.trim()) {
      telegramRuntimeConfig.botUsername = normalizeBotUsername(botUsername);
    }

    if (typeof chatId === 'string' && chatId.trim()) {
      const cleanChatId = chatId.trim();
      if (!TELEGRAM_CHAT_ID_REGEX.test(cleanChatId)) {
        return res.status(400).json({
          ok: false,
          error: 'ទម្រង់ Chat ID មិនត្រឹមត្រូវទេ (ឧទាហរណ៍៖ 8069577143 ឬ -100123456789)',
        });
      }
      telegramRuntimeConfig.chatId = cleanChatId;
    }

    if (typeof botToken === 'string' && botToken.trim()) {
      const cleanToken = botToken.trim();
      if (!TELEGRAM_TOKEN_REGEX.test(cleanToken)) {
        return res.status(400).json({
          ok: false,
          error: 'ទម្រង់ Telegram Bot Token មិនត្រឹមត្រូវទេ',
        });
      }
      telegramRuntimeConfig.botToken = cleanToken;
      telegramRuntimeConfig.source = 'runtime';
    }

    const activeToken = resolveActiveTelegramToken();
    res.json({
      ok: true,
      configured: Boolean(activeToken),
      maskedToken: maskTelegramToken(activeToken),
      botUsername: telegramRuntimeConfig.botUsername,
      chatId: telegramRuntimeConfig.chatId,
      source: (process.env.TELEGRAM_BOT_TOKEN || '').trim()
        ? 'env'
        : activeToken
        ? 'runtime'
        : 'none',
    });
  });

  // 1. Verify Telegram Bot Connection (getMe)
  app.post('/api/telegram/getMe', async (req, res) => {
    const provided = typeof req.body?.botToken === 'string' ? req.body.botToken.trim() : '';
    if (provided && !TELEGRAM_TOKEN_REGEX.test(provided)) {
      return res.status(400).json({ ok: false, error: 'ទម្រង់ Telegram Bot Token មិនត្រឹមត្រូវទេ' });
    }
    const token = provided || resolveActiveTelegramToken();
    if (!token) {
      return res.status(400).json({
        ok: false,
        error: 'មិនទាន់បានកំណត់ TELEGRAM_BOT_TOKEN នៅលើ Server ឬក្នុងការកំណត់ Bot នៅឡើយទេ',
      });
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      if (data?.ok && data?.result?.username) {
        telegramRuntimeConfig.botUsername = normalizeBotUsername(data.result.username);
      }
      res.json(data);
    } catch (err: any) {
      console.error('Telegram getMe error:', err?.message || 'network_error');
      res.status(500).json({ ok: false, error: 'មិនអាចតភ្ជាប់ទៅកាន់ Telegram API បានទេ' });
    }
  });

  // 2. Fetch Latest Chat IDs / Updates from Telegram users (getUpdates)
  app.post('/api/telegram/getUpdates', async (req, res) => {
    const provided = typeof req.body?.botToken === 'string' ? req.body.botToken.trim() : '';
    if (provided && !TELEGRAM_TOKEN_REGEX.test(provided)) {
      return res.status(400).json({ ok: false, error: 'ទម្រង់ Telegram Bot Token មិនត្រឹមត្រូវទេ' });
    }
    const token = provided || resolveActiveTelegramToken();
    if (!token) {
      return res.status(400).json({
        ok: false,
        error: 'សូមកំណត់ Telegram Bot Token ជាមុនសិន',
      });
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-10`);
      const data = await response.json();
      if (data.ok && Array.isArray(data.result)) {
        const chatsMap = new Map();
        for (const item of data.result) {
          const chat = item.message?.chat || item.channel_post?.chat || item.my_chat_member?.chat;
          if (chat && chat.id) {
            chatsMap.set(String(chat.id), {
              id: String(chat.id),
              title: chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || chat.username || 'Chat',
              type: chat.type,
              username: chat.username,
            });
          }
        }
        return res.json({
          ok: true,
          chats: Array.from(chatsMap.values()),
          rawCount: data.result.length,
        });
      }
      res.json(data);
    } catch (err: any) {
      console.error('Telegram getUpdates error:', err?.message || 'network_error');
      res.status(500).json({ ok: false, error: 'មិនអាចទាញយកបញ្ជី Chat ID ពី Telegram បានទេ' });
    }
  });

  // 3. Send Telegram Message
  app.post('/api/telegram/send', async (req, res) => {
    const { botToken, chatId, message, parseMode } = req.body || {};
    const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 4000) : '';
    if (!cleanMessage) {
      return res.status(400).json({ ok: false, error: 'សូមបញ្ចូលខ្លឹមសារសារជាមុនសិន' });
    }

    const providedToken = typeof botToken === 'string' ? botToken.trim() : '';
    if (providedToken && !TELEGRAM_TOKEN_REGEX.test(providedToken)) {
      return res.status(400).json({ ok: false, error: 'ទម្រង់ Telegram Bot Token មិនត្រឹមត្រូវទេ' });
    }
    const token = providedToken || resolveActiveTelegramToken();

    const destChatId = (typeof chatId === 'string' && chatId.trim() ? chatId.trim() : telegramRuntimeConfig.chatId).trim();
    if (destChatId && !TELEGRAM_CHAT_ID_REGEX.test(destChatId)) {
      return res.status(400).json({ ok: false, error: 'ទម្រង់ Chat ID មិនត្រឹមត្រូវទេ' });
    }

    if (!token || !destChatId) {
      return res.json({
        ok: true,
        simulated: true,
        message: 'បានកត់ត្រាសារក្នុងប្រព័ន្ធ (សូមកំណត់ TELEGRAM_BOT_TOKEN ក្នុង Settings -> Secrets ឬបញ្ចូល Token ក្នុងម៉ឺនុយ Telegram ដើម្បីបញ្ជូនផ្ទាល់)',
        sentAt: new Date().toISOString(),
      });
    }

    try {
      const payload: Record<string, any> = {
        chat_id: destChatId,
        text: cleanMessage,
      };
      if (parseMode === 'HTML') {
        payload.parse_mode = 'HTML';
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Telegram dispatch error:', err?.message || 'network_error');
      res.status(500).json({ ok: false, error: 'មិនអាចបញ្ជូនសារទៅកាន់ Telegram API បានទេ' });
    }
  });

  app.get('/api/device/capabilities', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent);
    res.json({
      deviceType: isMobile ? (isTablet ? 'tablet' : 'mobile') : 'desktop',
      isMobile,
      userAgent,
      capabilities: {
        touchOptimized: isMobile,
        responsiveColumns: isMobile ? 1 : 3,
        supportsRealTimeSync: true,
        cloudDatabaseOnline: true,
      },
    });
  });

  // -------------------------------------------------------------
  // Frontend Serving (Vite middleware in dev, Static in production)
  // -------------------------------------------------------------
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : true,
        ws: hmrDisabled ? false : ({ server: httpServer } as any),
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Samdech Techo Hun Sen Stung Trang High School Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
});

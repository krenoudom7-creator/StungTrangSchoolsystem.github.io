import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import {
  Student,
  Teacher,
  SchoolClass,
  AttendanceRecord,
  ExamResult,
  User,
} from '../types/index.ts';

// Isolated Firestore collections for Samdech Techo Hun Sen Stung Trang High School
// វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់ — completely separate from any previous school data
export const FIRESTORE_COLLECTIONS = {
  STUDENTS: 'sths_students',
  TEACHERS: 'sths_teachers',
  CLASSES: 'sths_classes',
  ATTENDANCE: 'sths_attendanceRecords',
  EXAM_RESULTS: 'sths_examResults',
  USERS: 'sths_users',
} as const;

type SyncCallback = {
  onStudentsChange?: (students: Student[]) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onClassesChange?: (classes: SchoolClass[]) => void;
  onAttendanceChange?: (records: AttendanceRecord[]) => void;
  onExamResultsChange?: (results: ExamResult[]) => void;
  onUsersChange?: (users: User[]) => void;
};

let unsubscribers: Unsubscribe[] = [];

/**
 * Start Real-Time Firestore Synchronization
 */
export function startFirestoreSync(callbacks: SyncCallback): () => void {
  // Clear any existing subscriptions
  stopFirestoreSync();

  try {
    // 1. Sync Students Collection
    const studentsUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.STUDENTS),
      (snapshot) => {
        const remoteStudents: Student[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Student;
          remoteStudents.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onStudentsChange?.(remoteStudents);
      },
      (error) => {
        console.warn('Students sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(studentsUnsub);

    // 2. Sync Teachers Collection
    const teachersUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.TEACHERS),
      (snapshot) => {
        const remoteTeachers: Teacher[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Teacher;
          remoteTeachers.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onTeachersChange?.(remoteTeachers);
      },
      (error) => {
        console.warn('Teachers sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(teachersUnsub);

    // 3. Sync Classes Collection
    const classesUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.CLASSES),
      (snapshot) => {
        const remoteClasses: SchoolClass[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SchoolClass;
          remoteClasses.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onClassesChange?.(remoteClasses);
      },
      (error) => {
        console.warn('Classes sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(classesUnsub);

    // 4. Sync Attendance Records
    const attendanceUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.ATTENDANCE),
      (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AttendanceRecord;
          records.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onAttendanceChange?.(records);
      },
      (error) => {
        console.warn('Attendance sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(attendanceUnsub);

    // 5. Sync Exam Results
    const examResultsUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.EXAM_RESULTS),
      (snapshot) => {
        const results: ExamResult[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ExamResult;
          results.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onExamResultsChange?.(results);
      },
      (error) => {
        console.warn('Exam results sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(examResultsUnsub);

    // 6. Sync Users
    const usersUnsub = onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.USERS),
      (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          users.push({
            ...data,
            id: data.id || docSnap.id,
          });
        });
        callbacks.onUsersChange?.(users);
      },
      (error) => {
        console.warn('Users sync warning (continuing with local cache):', error.message);
      }
    );
    unsubscribers.push(usersUnsub);
  } catch (err) {
    console.warn('Failed to initiate real-time Firestore listeners:', err);
  }

  return stopFirestoreSync;
}

export function stopFirestoreSync(): void {
  unsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // ignore
    }
  });
  unsubscribers = [];
}

/**
 * Helper to strip undefined fields recursively and ensure valid Firestore document payloads
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

export function toSafeFirestoreId(rawId: string, prefix = 'doc'): string {
  const cleaned = (rawId || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : `${prefix}_${Date.now()}`;
}

/**
 * Firestore Mutations with Standard Error Handling
 */
export async function syncStudentToCloud(student: Student): Promise<void> {
  const safeId = toSafeFirestoreId(student.id, 'stu');
  const path = `${FIRESTORE_COLLECTIONS.STUDENTS}/${safeId}`;
  try {
    const payload = sanitizeForFirestore({ ...student, id: safeId });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.STUDENTS, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeStudentFromCloud(
  studentId: string,
  studentCode?: string,
  khmerName?: string
): Promise<void> {
  const safeId = toSafeFirestoreId(studentId, 'stu');
  const path = `${FIRESTORE_COLLECTIONS.STUDENTS}/${safeId}`;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.STUDENTS, safeId));
    if (studentId && studentId !== safeId) {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.STUDENTS, studentId)).catch(() => {});
    }
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.STUDENTS));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const matchById =
        d.id === studentId ||
        d.id === safeId ||
        data?.id === studentId ||
        data?.id === safeId;
      const matchByCodeAndName =
        studentCode &&
        khmerName &&
        String(data?.studentId || '').trim() === studentCode.trim() &&
        String(data?.khmerName || '').trim() === khmerName.trim();
      if (matchById || matchByCodeAndName) {
        deletions.push(deleteDoc(doc(db, FIRESTORE_COLLECTIONS.STUDENTS, d.id)));
      }
    });
    if (deletions.length > 0) {
      await Promise.allSettled(deletions);
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn(`Cloud delete skipped for ${path} (unauthenticated session): local deletion persisted.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncTeacherToCloud(teacher: Teacher): Promise<void> {
  const safeId = toSafeFirestoreId(teacher.id, 'tch');
  const path = `${FIRESTORE_COLLECTIONS.TEACHERS}/${safeId}`;
  try {
    const payload = sanitizeForFirestore({ ...teacher, id: safeId });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.TEACHERS, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeTeacherFromCloud(teacherId: string, teacherCode?: string): Promise<void> {
  const safeId = toSafeFirestoreId(teacherId, 'tch');
  const path = `${FIRESTORE_COLLECTIONS.TEACHERS}/${safeId}`;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TEACHERS, safeId));
    if (teacherId && teacherId !== safeId) {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TEACHERS, teacherId)).catch(() => {});
    }
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.TEACHERS));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (
        d.id === teacherId ||
        d.id === safeId ||
        data?.id === teacherId ||
        data?.id === safeId ||
        (teacherCode && data?.teacherId === teacherCode)
      ) {
        deletions.push(deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TEACHERS, d.id)));
      }
    });
    if (deletions.length > 0) {
      await Promise.allSettled(deletions);
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn(`Cloud delete skipped for ${path} (unauthenticated session): local deletion persisted.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncClassToCloud(cls: SchoolClass): Promise<void> {
  const safeId = toSafeFirestoreId(cls.id, 'cls');
  const path = `${FIRESTORE_COLLECTIONS.CLASSES}/${safeId}`;
  try {
    const payload = sanitizeForFirestore({ ...cls, id: safeId });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.CLASSES, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeClassFromCloud(classId: string, className?: string): Promise<void> {
  const safeId = toSafeFirestoreId(classId, 'cls');
  const path = `${FIRESTORE_COLLECTIONS.CLASSES}/${safeId}`;
  const normTargetName = className ? className.trim().replace(/\s+/g, ' ') : '';
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CLASSES, safeId));
    if (classId && classId !== safeId) {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CLASSES, classId)).catch(() => {});
    }
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.CLASSES));
    const deletions: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const docNormName = String(data?.name || '').trim().replace(/\s+/g, ' ');
      if (
        d.id === classId ||
        d.id === safeId ||
        data?.id === classId ||
        data?.id === safeId ||
        (normTargetName && docNormName === normTargetName)
      ) {
        deletions.push(deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CLASSES, d.id)));
      }
    });
    if (deletions.length > 0) {
      await Promise.allSettled(deletions);
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn(`Cloud delete skipped for ${path} (unauthenticated session): local deletion persisted.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncAttendanceRecordToCloud(record: AttendanceRecord): Promise<void> {
  const safeId = toSafeFirestoreId(record.id, 'att');
  const path = `${FIRESTORE_COLLECTIONS.ATTENDANCE}/${safeId}`;
  try {
    const payload: Record<string, any> = {
      id: safeId,
      sessionId: String(record.sessionId || `sess-${record.classId}-${record.date}`).slice(0, 128),
      studentId: String(record.studentId || '').slice(0, 128),
      classId: String(record.classId || '').slice(0, 64),
      date: String(record.date || '').slice(0, 32),
      status: record.status || 'present',
      recordedBy: String(record.recordedBy || 'admin').slice(0, 128),
    };
    if (record.studentName) payload.studentName = String(record.studentName).slice(0, 128);
    if (record.reason !== undefined && record.reason !== null) {
      payload.reason = String(record.reason).slice(0, 256);
    }
    if (record.recordedByName) payload.recordedByName = String(record.recordedByName).slice(0, 128);
    if (record.subjectId) payload.subjectId = String(record.subjectId).slice(0, 64);
    if (record.createdAt) payload.createdAt = String(record.createdAt).slice(0, 64);

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.ATTENDANCE, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeAttendanceRecordFromCloud(recordId: string): Promise<void> {
  const safeId = toSafeFirestoreId(recordId, 'att');
  const path = `${FIRESTORE_COLLECTIONS.ATTENDANCE}/${safeId}`;
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.ATTENDANCE, safeId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.warn(`Cloud delete skipped for ${path}: local deletion persisted.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncExamResultToCloud(result: ExamResult): Promise<void> {
  const safeId = toSafeFirestoreId(result.id, 'res');
  const path = `${FIRESTORE_COLLECTIONS.EXAM_RESULTS}/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      ...result,
      id: safeId,
      totalScore: Number(result.totalScore) || 0,
      average: Number(result.average) || 0,
    });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.EXAM_RESULTS, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncUserToCloud(user: User): Promise<void> {
  const safeId = toSafeFirestoreId(user.id, 'usr');
  const path = `${FIRESTORE_COLLECTIONS.USERS}/${safeId}`;
  try {
    const payload = sanitizeForFirestore({
      ...user,
      id: safeId,
      email: user.email || `${user.username || 'user'}@stungtranghs.edu.kh`,
    });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

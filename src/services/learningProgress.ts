import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { CertificateRecord, LessonMasteryState } from '../types';
import { firestoreDb } from '../lib/firebase';

function requireDatabase() {
  if (!firestoreDb) {
    throw new Error('Cloud Firestore is not configured. This learning activity can still be saved on this device.');
  }
  return firestoreDb;
}

export async function loadLearningProgress(uid: string): Promise<Record<string, LessonMasteryState>> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'learningProgress'));
  return snapshot.docs.reduce<Record<string, LessonMasteryState>>((records, item) => {
    const data = item.data();
    if (typeof data.lessonId === 'string' && typeof data.isCompleted === 'boolean' &&
        typeof data.isMastered === 'boolean' && typeof data.scorePercent === 'number' &&
        typeof data.attemptsCount === 'number') {
      records[data.lessonId] = {
        lessonId: data.lessonId,
        isCompleted: data.isCompleted,
        isMastered: data.isMastered,
        scorePercent: data.scorePercent,
        attemptsCount: data.attemptsCount,
        lastAttemptDate: typeof data.lastAttemptDate === 'string' ? data.lastAttemptDate : undefined,
        identifiedMisconceptions: Array.isArray(data.identifiedMisconceptions)
          ? data.identifiedMisconceptions.filter((value: unknown): value is string => typeof value === 'string')
          : [],
        remedialActivitiesCompleted: data.remedialActivitiesCompleted === true,
      };
    }
    return records;
  }, {});
}

export async function saveLearningProgress(uid: string, record: LessonMasteryState): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'learningProgress', record.lessonId), {
    ...record,
    updatedAt: serverTimestamp(),
  });
}

export async function loadLessonNotes(uid: string, lessonId: string): Promise<string> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'lessonNotes'));
  const item = snapshot.docs.find((entry) => entry.id === lessonId);
  return typeof item?.data().notes === 'string' ? item.data().notes as string : '';
}

export async function saveLessonNotes(uid: string, lessonId: string, notes: string): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'lessonNotes', lessonId), {
    lessonId,
    notes: notes.slice(0, 20000),
    updatedAt: serverTimestamp(),
  });
}

export async function loadLastOpenedLesson(uid: string, courseId: string): Promise<string | null> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'learningState'));
  const item = snapshot.docs.find((entry) => entry.id === courseId);
  return typeof item?.data().lastLessonId === 'string' ? item.data().lastLessonId as string : null;
}

export async function saveLastOpenedLesson(uid: string, courseId: string, lessonId: string): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'learningState', courseId), {
    courseId,
    lastLessonId: lessonId,
    lastOpenedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function loadLearningCertificates(uid: string): Promise<CertificateRecord[]> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'learningCertificates'));
  return snapshot.docs.map((item) => item.data() as CertificateRecord);
}

export async function saveLearningCertificate(uid: string, certificate: CertificateRecord): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'learningCertificates', certificate.id), {
    ...certificate,
    updatedAt: serverTimestamp(),
  });
}

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import type { LiveTranscriptSession } from '../types';
import { firestoreDb } from '../lib/firebase';

function requireDatabase() {
  if (!firestoreDb) throw new Error('Cloud Firestore is not configured.');
  return firestoreDb;
}

function toSession(id: string, data: Record<string, unknown>): LiveTranscriptSession | null {
  if (
    typeof data.title !== 'string' ||
    typeof data.courseTitle !== 'string' ||
    !['advance', 'university', 'professionals'].includes(String(data.stage)) ||
    typeof data.date !== 'string' ||
    typeof data.durationSeconds !== 'number' ||
    typeof data.transcript !== 'string'
  ) return null;

  return {
    id,
    title: data.title,
    courseTitle: data.courseTitle,
    stage: data.stage as LiveTranscriptSession['stage'],
    date: data.date,
    durationSeconds: data.durationSeconds,
    transcript: data.transcript,
    ...(typeof data.summary === 'string' ? { summary: data.summary } : {}),
    ...(Array.isArray(data.actionItems)
      ? { actionItems: data.actionItems.filter((item): item is string => typeof item === 'string').slice(0, 20) }
      : {}),
  };
}

export async function loadTranscriptSessions(uid: string): Promise<LiveTranscriptSession[]> {
  const sessions = await getDocs(query(
    collection(requireDatabase(), 'users', uid, 'transcriptSessions'),
    orderBy('date', 'desc'),
  ));
  return sessions.docs
    .map((snapshot) => toSession(snapshot.id, snapshot.data()))
    .filter((session): session is LiveTranscriptSession => session !== null);
}

export async function saveTranscriptSession(uid: string, session: LiveTranscriptSession): Promise<void> {
  const database = requireDatabase();
  await setDoc(doc(database, 'users', uid, 'transcriptSessions', session.id), {
    id: session.id,
    title: session.title.slice(0, 120),
    courseTitle: session.courseTitle.slice(0, 200),
    stage: session.stage,
    date: session.date.slice(0, 10),
    durationSeconds: Math.max(0, Math.min(86400, Math.floor(session.durationSeconds))),
    transcript: session.transcript.slice(0, 400000),
    ...(session.summary ? { summary: session.summary.slice(0, 30000) } : {}),
    ...(session.actionItems ? { actionItems: session.actionItems.slice(0, 20).map((item) => item.slice(0, 500)) } : {}),
  }, { merge: true });
}

export async function deleteTranscriptSession(uid: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(requireDatabase(), 'users', uid, 'transcriptSessions', sessionId));
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { AppNotification, TaskItem } from '../types';
import { firestoreDb } from '../lib/firebase';

function requireDatabase() {
  if (!firestoreDb) {
    throw new Error('Cloud Firestore is not configured. This activity is kept on this device only.');
  }
  return firestoreDb;
}

function toTask(data: Record<string, unknown>, id: string): TaskItem | null {
  if (
    typeof data.title !== 'string' ||
    typeof data.subject !== 'string' ||
    typeof data.courseId !== 'string' ||
    !['early', 'junior', 'senior', 'advance', 'university', 'professionals'].includes(String(data.stage)) ||
    typeof data.dueDate !== 'string' ||
    !['urgent', 'medium', 'normal'].includes(String(data.urgency)) ||
    !['pending', 'in_progress', 'completed'].includes(String(data.status)) ||
    !['quiz', 'assignment', 'reading', 'revision', 'exam'].includes(String(data.type))
  ) return null;
  return {
    id,
    title: data.title,
    subject: data.subject,
    courseId: data.courseId,
    stage: data.stage as TaskItem['stage'],
    dueDate: data.dueDate,
    urgency: data.urgency as TaskItem['urgency'],
    status: data.status as TaskItem['status'],
    type: data.type as TaskItem['type'],
  };
}

function toNotification(data: Record<string, unknown>, id: string): AppNotification | null {
  if (
    typeof data.title !== 'string' ||
    typeof data.message !== 'string' ||
    !['early', 'junior', 'senior', 'advance', 'university', 'professionals'].includes(String(data.stage)) ||
    !['deadline', 'feedback', 'mastery', 'community', 'system', 'certification'].includes(String(data.type)) ||
    typeof data.date !== 'string' ||
    typeof data.unread !== 'boolean'
  ) return null;
  return {
    id,
    title: data.title,
    message: data.message,
    stage: data.stage as AppNotification['stage'],
    type: data.type as AppNotification['type'],
    date: data.date,
    unread: data.unread,
    ...(typeof data.actionUrl === 'string' ? { actionUrl: data.actionUrl } : {}),
  };
}

// ---------------------------------------------------------------- tasks

export async function loadLearnerTasks(uid: string): Promise<TaskItem[]> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'learningTasks'));
  return snapshot.docs
    .map((entry) => toTask(entry.data(), entry.id))
    .filter((task): task is TaskItem => task !== null);
}

export async function saveLearnerTask(uid: string, task: TaskItem): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'learningTasks', task.id), {
    ...task,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLearnerTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(requireDatabase(), 'users', uid, 'learningTasks', taskId));
}

// ---------------------------------------------------------- notifications

export async function loadLearnerNotifications(uid: string): Promise<AppNotification[]> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'learningNotifications'));
  return snapshot.docs
    .map((entry) => toNotification(entry.data(), entry.id))
    .filter((notification): notification is AppNotification => notification !== null);
}

export async function saveLearnerNotification(uid: string, notification: AppNotification): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'learningNotifications', notification.id), {
    ...notification,
    updatedAt: serverTimestamp(),
  });
}

// ------------------------------------------------------------- assignments

const ASSIGNMENT_MAX = 20000;

export async function loadAssignmentSubmission(
  uid: string,
  assignmentId: string,
): Promise<{ content: string; status: string; scorePercent: number; markerFeedback: string; gradedAt: string } | null> {
  const snapshot = await getDoc(doc(requireDatabase(), 'users', uid, 'assignmentSubmissions', assignmentId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    content: typeof data.content === 'string' ? data.content : '',
    status: typeof data.status === 'string' ? data.status : 'submitted',
    scorePercent: typeof data.scorePercent === 'number' ? data.scorePercent : 0,
    markerFeedback: typeof data.markerFeedback === 'string' ? data.markerFeedback : '',
    gradedAt: typeof data.gradedAt === 'string' ? data.gradedAt : '',
  };
}

export async function saveAssignmentSubmission(
  uid: string,
  submission: {
    assignmentId: string;
    content: string;
    submittedAt: string;
    attemptNumber: number;
    status: string;
  },
): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'assignmentSubmissions', submission.assignmentId), {
    ...submission,
    content: submission.content.slice(0, ASSIGNMENT_MAX),
    updatedAt: serverTimestamp(),
  });
}

export async function saveAssignmentMarking(
  uid: string,
  marking: {
    assignmentId: string;
    content: string;
    submittedAt: string;
    attemptNumber: number;
    status: string;
    scorePercent: number;
    markerFeedback: string;
    gradedAt: string;
    criterionScores: { criterionId: string; awarded: number; outOf: number }[];
  },
): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'assignmentSubmissions', marking.assignmentId), {
    ...marking,
    content: marking.content.slice(0, ASSIGNMENT_MAX),
    markerFeedback: marking.markerFeedback.slice(0, 5000),
    updatedAt: serverTimestamp(),
  });
}

// ------------------------------------------------------- exam attempts

export async function loadExamAttempts(uid: string): Promise<import('../types').ExamAttemptRecord[]> {
  const snapshot = await getDocs(collection(requireDatabase(), 'users', uid, 'examAttempts'));
  return snapshot.docs
    .map((entry) => {
      const data = entry.data();
      if (
        typeof data.courseId !== 'string' ||
        typeof data.examId !== 'string' ||
        typeof data.scorePercent !== 'number' ||
        typeof data.passed !== 'boolean' ||
        typeof data.passingScorePercent !== 'number' ||
        typeof data.submittedAt !== 'string' ||
        typeof data.answers !== 'object' || data.answers === null
      ) return null;
      return {
        id: entry.id,
        courseId: data.courseId,
        examId: data.examId,
        scorePercent: data.scorePercent,
        passed: data.passed,
        passingScorePercent: data.passingScorePercent,
        answers: data.answers as Record<string, number>,
        submittedAt: data.submittedAt,
      } satisfies import('../types').ExamAttemptRecord;
    })
    .filter((attempt): attempt is import('../types').ExamAttemptRecord => attempt !== null);
}

export async function saveExamAttempt(uid: string, attempt: import('../types').ExamAttemptRecord): Promise<void> {
  await setDoc(doc(requireDatabase(), 'users', uid, 'examAttempts', attempt.id), {
    ...attempt,
    updatedAt: serverTimestamp(),
  });
}

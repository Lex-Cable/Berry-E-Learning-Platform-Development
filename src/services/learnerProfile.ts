import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase';
import type { AdvanceTrack, Curriculum, LearnerProfile, LearnerStage, SeniorPathway } from '../types';

const stages: LearnerStage[] = ['early', 'junior', 'senior', 'advance', 'university', 'professionals'];
const curricula: Curriculum[] = ['kenya_cbc', 'cambridge', 'uk_national', 'us_common_core', 'ib'];
const seniorPathways: SeniorPathway[] = ['stem', 'social_sciences', 'arts_sports'];
const advanceTracks: AdvanceTrack[] = ['university', 'professional'];

function requireFirestore() {
  if (!firestoreDb) {
    throw new Error(
      'Cloud Firestore is not configured. Add the VITE_FIREBASE_* values to .env.local and create a Cloud Firestore database in Firebase Console.'
    );
  }
  return firestoreDb;
}

function validEnum<T extends string>(value: unknown, options: T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeLearnerProfile(
  uid: string,
  displayName: string | null | undefined,
  data: Partial<LearnerProfile>
): LearnerProfile {
  const accessibility = data.accessibility;
  const fontSize = accessibility?.fontSize;

  return {
    id: uid,
    name: safeString(data.name, displayName || 'Learner'),
    stage: validEnum(data.stage, stages, 'junior'),
    country: safeString(data.country, 'Kenya'),
    curriculum: validEnum(data.curriculum, curricula, 'kenya_cbc'),
    gradeLevel: safeString(data.gradeLevel, 'Grade 1'),
    seniorPathway: seniorPathways.includes(data.seniorPathway as SeniorPathway)
      ? data.seniorPathway
      : undefined,
    advanceTrack: advanceTracks.includes(data.advanceTrack as AdvanceTrack)
      ? data.advanceTrack
      : undefined,
    institutionOrCompany: typeof data.institutionOrCompany === 'string' ? data.institutionOrCompany : undefined,
    avatarUrl: safeString(data.avatarUrl, ''),
    enrolledCourseIds: Array.isArray(data.enrolledCourseIds)
      ? data.enrolledCourseIds.filter((courseId): courseId is string => typeof courseId === 'string').slice(0, 100)
      : [],
    learningStreakDays:
      typeof data.learningStreakDays === 'number' && Number.isFinite(data.learningStreakDays)
        ? Math.max(0, Math.floor(data.learningStreakDays))
        : 0,
    dailyGoalMinutes:
      typeof data.dailyGoalMinutes === 'number' && Number.isFinite(data.dailyGoalMinutes)
        ? Math.min(300, Math.max(5, Math.floor(data.dailyGoalMinutes)))
        : 30,
    completedMinutesToday:
      typeof data.completedMinutesToday === 'number' && Number.isFinite(data.completedMinutesToday)
        ? Math.max(0, Math.floor(data.completedMinutesToday))
        : 0,
    accessibility: {
      fontSize: fontSize === 'large' || fontSize === 'xlarge' ? fontSize : 'normal',
      highContrast: accessibility?.highContrast === true,
      reduceMotion: accessibility?.reduceMotion === true,
      dyslexiaFont: accessibility?.dyslexiaFont === true,
    },
  };
}

function profileDocument(profile: LearnerProfile) {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined)
  );
}

export async function saveLearnerProfile(
  uid: string,
  profile: Partial<LearnerProfile>,
  displayName?: string | null
): Promise<LearnerProfile> {
  const normalized = normalizeLearnerProfile(uid, displayName, profile);
  await setDoc(
    doc(requireFirestore(), 'users', uid),
    { ...profileDocument(normalized), updatedAt: serverTimestamp() }
  );
  return normalized;
}

export async function getOrCreateLearnerProfile(
  uid: string,
  displayName?: string | null
): Promise<LearnerProfile> {
  const database = requireFirestore();
  const reference = doc(database, 'users', uid);
  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const profile = normalizeLearnerProfile(
      uid,
      displayName,
      snapshot.exists() ? (snapshot.data() as Partial<LearnerProfile>) : {}
    );

    // Create missing profiles and repair outdated ones without racing signup writes.
    transaction.set(reference, {
      ...profileDocument(profile),
      updatedAt: serverTimestamp(),
    });
    return profile;
  });
}

/*export function getLearnerProfileErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') {
    return 'Berry could not access this learner profile. Check that the Firestore security rules have been published.';
  }
  if (code === 'unavailable' || code === 'failed-precondition') {
    return 'Berry could not reach the learner profile database. Check your connection and Firebase setup.';
  }
  return error instanceof Error ? error.message : 'Could not save the learner profile. Please try again.';
}*/export function getLearnerProfileErrorMessage(error: unknown): string {
  console.error('Full learner profile error:', error);

  if (error instanceof Error) {
    const firebaseError = error as Error & {
      code?: string;
      customData?: unknown;
    };

    return `${firebaseError.code ?? 'unknown'}: ${firebaseError.message}`;
  }

  return String(error);
}

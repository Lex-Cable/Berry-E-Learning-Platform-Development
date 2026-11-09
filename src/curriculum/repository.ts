import type { AdvanceTrack, Course, Curriculum, LearnerProfile, LearnerStage } from '../types';

export type CanonicalStageId = 'early_years' | 'primary' | 'secondary' | 'advanced';

export interface CanonicalStage {
  id: CanonicalStageId;
  label: string;
  legacyStages: LearnerStage[];
}

export interface CurriculumDescriptor {
  id: Curriculum;
  label: string;
}

export interface CoursePlacement {
  canonicalStage: CanonicalStageId;
  sourceStage: LearnerStage;
  advanceTrack?: AdvanceTrack;
  curriculum: Curriculum;
  gradeLevel: string;
  subject: string;
}

export interface CurriculumCourseEntry {
  course: Course;
  placement: CoursePlacement;
}

export interface CurriculumRepository {
  curricula: CurriculumDescriptor[];
  stages: CanonicalStage[];
  entries: CurriculumCourseEntry[];
  courses: Course[];
  byId: Record<string, CurriculumCourseEntry>;
  byCurriculum: Partial<Record<Curriculum, CurriculumCourseEntry[]>>;
  byStage: Record<CanonicalStageId, CurriculumCourseEntry[]>;
  byGrade: Record<string, CurriculumCourseEntry[]>;
  bySubject: Record<string, CurriculumCourseEntry[]>;
  duplicateCourseIds: string[];
}

export const CANONICAL_STAGES: CanonicalStage[] = [
  { id: 'early_years', label: 'Early Years', legacyStages: ['early'] },
  { id: 'primary', label: 'Primary & Junior Learning', legacyStages: ['junior'] },
  { id: 'secondary', label: 'Secondary & Senior Learning', legacyStages: ['senior'] },
  { id: 'advanced', label: 'Advanced Learning', legacyStages: ['advance', 'university', 'professionals'] },
];

export const CURRICULUM_DESCRIPTORS: CurriculumDescriptor[] = [
  { id: 'kenya_cbc', label: 'Kenya Competency-Based Curriculum' },
  { id: 'cambridge', label: 'Cambridge International' },
  { id: 'uk_national', label: 'England National Curriculum' },
  { id: 'us_common_core', label: 'US Common Core' },
  { id: 'ib', label: 'International Baccalaureate' },
];

export function resolveCanonicalStage(stage: LearnerStage): CanonicalStageId {
  switch (stage) {
    case 'early': return 'early_years';
    case 'junior': return 'primary';
    case 'senior': return 'secondary';
    case 'advance':
    case 'university':
    case 'professionals':
      return 'advanced';
  }
}

export function resolveAdvanceTrack(
  stage: LearnerStage,
  explicitTrack?: AdvanceTrack,
): AdvanceTrack | undefined {
  if (stage === 'university') return 'university';
  if (stage === 'professionals') return 'professional';
  return stage === 'advance' ? explicitTrack : undefined;
}

export function resolveLearnerPlacement(learner: Pick<LearnerProfile, 'stage' | 'advanceTrack'>) {
  return {
    canonicalStage: resolveCanonicalStage(learner.stage),
    sourceStage: learner.stage,
    advanceTrack: resolveAdvanceTrack(learner.stage, learner.advanceTrack),
  };
}

export function resolveCoursePlacement(course: Course): CoursePlacement {
  return {
    canonicalStage: resolveCanonicalStage(course.stage),
    sourceStage: course.stage,
    advanceTrack: resolveAdvanceTrack(course.stage, course.advanceTrack),
    curriculum: course.curriculum,
    gradeLevel: course.gradeLevel,
    subject: course.subject,
  };
}

function addToIndex<T>(index: Record<string, T[]>, key: string, value: T) {
  const bucket = index[key] ?? (index[key] = []);
  bucket.push(value);
}

/**
 * Builds a normalized, searchable view over Berry's existing authored course data.
 * The source Course objects remain unchanged so legacy screens and saved IDs continue
 * to work while curriculum content is migrated incrementally.
 */
export function buildCurriculumRepository(courses: Course[]): CurriculumRepository {
  const entries: CurriculumCourseEntry[] = [];
  const byId: Record<string, CurriculumCourseEntry> = {};
  const byCurriculum: Partial<Record<Curriculum, CurriculumCourseEntry[]>> = {};
  const byStage: Record<CanonicalStageId, CurriculumCourseEntry[]> = {
    early_years: [], primary: [], secondary: [], advanced: [],
  };
  const byGrade: Record<string, CurriculumCourseEntry[]> = {};
  const bySubject: Record<string, CurriculumCourseEntry[]> = {};
  const duplicateCourseIds: string[] = [];

  for (const course of courses) {
    const entry = { course, placement: resolveCoursePlacement(course) };
    if (byId[course.id]) {
      duplicateCourseIds.push(course.id);
      continue;
    }
    byId[course.id] = entry;
    entries.push(entry);
    byStage[entry.placement.canonicalStage].push(entry);
    addToIndex(byGrade, course.gradeLevel.trim().toLocaleLowerCase(), entry);
    addToIndex(bySubject, course.subject.trim().toLocaleLowerCase(), entry);
    (byCurriculum[course.curriculum] ??= []).push(entry);
  }

  return {
    curricula: CURRICULUM_DESCRIPTORS,
    stages: CANONICAL_STAGES,
    entries,
    courses: entries.map(({ course }) => course),
    byId,
    byCurriculum,
    byStage,
    byGrade,
    bySubject,
    duplicateCourseIds,
  };
}

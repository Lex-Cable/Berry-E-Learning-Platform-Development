import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course, LearnerProfile } from '../types';
import {
  buildCurriculumRepository,
  resolveAdvanceTrack,
  resolveCanonicalStage,
  resolveLearnerPlacement,
} from './repository';

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cbc-g1-math',
    title: 'Grade 1 Mathematics',
    code: 'CBC-G1-MATH',
    stage: 'junior',
    curriculum: 'kenya_cbc',
    gradeLevel: 'Grade 1',
    subject: 'Mathematics',
    description: '',
    bannerColor: '',
    badgeText: '',
    estimatedHours: 1,
    objectives: [],
    prerequisites: [],
    chapters: [],
    ...overrides,
  };
}

test('maps all six legacy learner stages into four canonical stages', () => {
  assert.equal(resolveCanonicalStage('early'), 'early_years');
  assert.equal(resolveCanonicalStage('junior'), 'primary');
  assert.equal(resolveCanonicalStage('senior'), 'secondary');
  assert.equal(resolveCanonicalStage('advance'), 'advanced');
  assert.equal(resolveCanonicalStage('university'), 'advanced');
  assert.equal(resolveCanonicalStage('professionals'), 'advanced');
});

test('preserves university and professional tracks when resolving advanced placement', () => {
  assert.equal(resolveAdvanceTrack('university'), 'university');
  assert.equal(resolveAdvanceTrack('professionals'), 'professional');
  assert.equal(resolveAdvanceTrack('advance', 'university'), 'university');
  assert.equal(resolveAdvanceTrack('advance', 'professional'), 'professional');
  assert.equal(resolveAdvanceTrack('junior'), undefined);
});

test('builds searchable curriculum, stage, grade and subject indexes without mutating courses', () => {
  const courses = [
    course(),
    course({ id: 'cambridge-y7-science', curriculum: 'cambridge', stage: 'senior', gradeLevel: 'Year 7', subject: 'Science' }),
    course({ id: 'uni-cs-101', stage: 'university', advanceTrack: 'university', gradeLevel: 'Bachelor Year 1', subject: 'Computer Science' }),
  ];
  const repository = buildCurriculumRepository(courses);

  assert.equal(repository.entries.length, 3);
  assert.equal(repository.byCurriculum.kenya_cbc?.length, 1);
  assert.equal(repository.byCurriculum.cambridge?.length, 1);
  assert.equal(repository.byStage.primary.length, 1);
  assert.equal(repository.byStage.secondary.length, 1);
  assert.equal(repository.byStage.advanced.length, 1);
  assert.equal(repository.byGrade['grade 1']?.[0].course.id, 'cbc-g1-math');
  assert.equal(repository.bySubject['computer science']?.[0].course.id, 'uni-cs-101');
  assert.equal(repository.byId['uni-cs-101'].placement.advanceTrack, 'university');
  assert.equal(courses.length, 3);
});

test('reports duplicate course IDs rather than silently replacing the first course', () => {
  const repository = buildCurriculumRepository([course(), course({ title: 'Duplicate' })]);
  assert.deepEqual(repository.duplicateCourseIds, ['cbc-g1-math']);
  assert.equal(repository.entries.length, 1);
  assert.equal(repository.byId['cbc-g1-math'].course.title, 'Grade 1 Mathematics');
});

test('resolves learner placement without changing the legacy learner profile', () => {
  const learner = { stage: 'professionals', advanceTrack: 'professional' } as Pick<LearnerProfile, 'stage' | 'advanceTrack'>;
  assert.deepEqual(resolveLearnerPlacement(learner), {
    canonicalStage: 'advanced',
    sourceStage: 'professionals',
    advanceTrack: 'professional',
  });
});

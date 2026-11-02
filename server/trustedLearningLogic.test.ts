import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartFullRetake, certificateUnmetRequirements, isPassingExamScore, summarizeCourseProgress } from './trustedLearningLogic';

test('exam pass mark is at least 75 percent', () => {
  assert.equal(isPassingExamScore(74), false);
  assert.equal(isPassingExamScore(75), true);
  assert.equal(isPassingExamScore(76), true);
  assert.equal(isPassingExamScore(80, 85), false);
  assert.equal(isPassingExamScore(85, 85), true);
});

test('course mastery uses mastered lessons across the whole course', () => {
  const summary = summarizeCourseProgress([
    { isCompleted: true, isMastered: true },
    { isCompleted: true, isMastered: true },
    { isCompleted: true, isMastered: false },
    { isCompleted: false, isMastered: false },
  ], 4);
  assert.deepEqual(summary, { completedCount: 3, masteredCount: 2, courseMasteryPercent: 50, courseCompleted: false });
  assert.equal(summarizeCourseProgress([], 0).courseMasteryPercent, 0);
});

test('full retake is unavailable until every course lesson is completed', () => {
  assert.equal(canStartFullRetake([{ isCompleted: true }, { isCompleted: false }], 2), false);
  assert.equal(canStartFullRetake([{ isCompleted: true }, { isCompleted: true }], 2), true);
  assert.equal(canStartFullRetake([], 0), false);
});

test('certificate eligibility rejects missing requirements and accepts a fully eligible course', () => {
  const base = { totalLessons: 2, progress: [{ isCompleted: true, isMastered: true }, { isCompleted: true, isMastered: true }], examPassed: true, assignments: [{ status: 'graded', scorePercent: 75 }], approvedAssignmentCount: 1, certificateAlreadyIssued: false };
  assert.deepEqual(certificateUnmetRequirements(base), []);
  assert.ok(certificateUnmetRequirements({ ...base, approvedAssignmentCount: 0, assignments: [] }).some((item) => item.includes('rubric')));
  assert.ok(certificateUnmetRequirements({ ...base, examPassed: false }).some((item) => item.includes('exam')));
  assert.ok(certificateUnmetRequirements({ ...base, certificateAlreadyIssued: true }).some((item) => item.includes('already issued')));
  assert.ok(certificateUnmetRequirements({ ...base, progress: [{ isCompleted: true, isMastered: true }, { isCompleted: true, isMastered: false }] }).some((item) => item.includes('mastery')));
  assert.ok(certificateUnmetRequirements({ ...base, assignments: [{ status: 'graded', scorePercent: 49 }] }).some((item) => item.includes('assignment')));
});

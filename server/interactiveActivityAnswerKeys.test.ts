import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from './privateCurriculumData';
import { withInteractivePractice } from '../src/utils/interactiveActivities';

test('every authored multiple-choice interactive activity has exactly one trusted correct option', () => {
  const courses = withInteractivePractice(COURSES);
  const activities = courses.flatMap((course) => course.chapters.flatMap((chapter) =>
    chapter.lessons.flatMap((lesson) => lesson.activities
      .filter((activity) => activity.type === 'interactive-choice')
      .map((activity) => ({ course: course.id, lesson: lesson.id, activity })))));
  assert.ok(activities.length > 0, 'expected authored multiple-choice activities to be present');
  for (const { course, lesson, activity } of activities) {
    const choices = activity.data.choices || [];
    assert.ok(choices.length >= 2, `${course}/${lesson}/${activity.id}: expected at least two answer choices`);
    assert.equal(
      choices.filter((choice) => choice.isCorrect === true).length,
      1,
      `${course}/${lesson}/${activity.id}: expected exactly one explicitly correct answer`,
    );
    assert.ok(
      choices.every((choice) => typeof choice.feedback === 'string' && choice.feedback.trim().length > 0),
      `${course}/${lesson}/${activity.id}: every option must have learner feedback`,
    );
  }
});

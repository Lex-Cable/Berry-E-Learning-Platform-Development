import type { Course, Lesson } from '../types';

export interface CourseCoverageIssue {
  courseId: string;
  courseTitle: string;
  kind: 'empty_chapter' | 'missing_lesson_reference' | 'duplicate_lesson_id' | 'lesson_missing_content' | 'no_exam_content';
  message: string;
}

export interface CurriculumCoverageReport {
  totalCourses: number;
  totalLessons: number;
  coursesAudited: number;
  issues: CourseCoverageIssue[];
  coursesWithIssues: string[];
}

/**
 * Audits the curriculum catalogue for structural defects: empty chapters, lesson
 * prerequisite references that point at lessons which do not exist, duplicated lesson
 * IDs, and lessons with no assessable content. Berry must surface real gaps, not
 * hide them behind fabricated content.
 */
export function auditCurriculumCoverage(courses: Course[]): CurriculumCoverageReport {
  const issues: CourseCoverageIssue[] = [];
  let totalLessons = 0;

  courses.forEach((course) => {
    const lessonIds = new Set<string>();
    course.chapters.forEach((chapter) => {
      if (chapter.lessons.length === 0) {
        issues.push({
          courseId: course.id,
          courseTitle: course.title,
          kind: 'empty_chapter',
          message: `Chapter "${chapter.title}" has no lessons.`,
        });
      }
      chapter.lessons.forEach((lesson) => {
        totalLessons += 1;
        if (lessonIds.has(lesson.id)) {
          issues.push({
            courseId: course.id,
            courseTitle: course.title,
            kind: 'duplicate_lesson_id',
            message: `Lesson id "${lesson.id}" appears more than once.`,
          });
        }
        lessonIds.add(lesson.id);
        const hasAssessment = lesson.quizQuestions.length > 0 || lesson.activities.length > 0;
        if (!hasAssessment || lesson.notesMarkdown.trim().length === 0) {
          issues.push({
            courseId: course.id,
            courseTitle: course.title,
            kind: 'lesson_missing_content',
            message: `Lesson "${lesson.title}" (${lesson.id}) is missing notes or assessable content.`,
          });
        }
      });
    });

    // Prerequisite references must resolve to lessons inside this course.
    course.chapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        lesson.prerequisites.forEach((prereqId) => {
          if (!lessonIds.has(prereqId)) {
            issues.push({
              courseId: course.id,
              courseTitle: course.title,
              kind: 'missing_lesson_reference',
              message: `Lesson "${lesson.title}" requires prerequisite "${prereqId}" which does not exist in this course.`,
            });
          }
        });
      });
    });

    if (course.exam && course.exam.questions.length === 0) {
      issues.push({
        courseId: course.id,
        courseTitle: course.title,
        kind: 'no_exam_content',
        message: `Exam "${course.exam.title}" contains no questions.`,
      });
    }
  });

  const coursesWithIssues = Array.from(new Set(issues.map((issue) => issue.courseId)));
  return {
    totalCourses: courses.length,
    totalLessons,
    coursesAudited: courses.length,
    issues,
    coursesWithIssues,
  };
}

/**
 * Finds the first accessible lesson in a course, skipping lessons whose prerequisites
 * are unresolvable (missing) so learners always have a valid starting point even when
 * the catalogue contains broken prerequisite chains.
 */
export function findFallbackLesson(course: Course, masteredLessonIds: string[] = []): Lesson | null {
  const allLessons = course.chapters.flatMap((chapter) => chapter.lessons);
  if (allLessons.length === 0) return null;
  const lessonIds = new Set(allLessons.map((lesson) => lesson.id));

  const unlocked = allLessons.find((lesson) =>
    lesson.prerequisites.length === 0 || lesson.prerequisites.every((prereqId) =>
      lessonIds.has(prereqId) && (masteredLessonIds.length === 0 || masteredLessonIds.includes(prereqId)),
    ),
  );
  return unlocked ?? allLessons[0];
}

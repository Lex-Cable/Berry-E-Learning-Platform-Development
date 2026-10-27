export type LearnerStage = 'early' | 'junior' | 'senior' | 'advance' | 'university' | 'professionals';

export type Curriculum = 'kenya_cbc' | 'cambridge' | 'uk_national' | 'us_common_core' | 'ib';

export type SeniorPathway = 'stem' | 'social_sciences' | 'arts_sports';

export type AdvanceTrack = 'university' | 'professional';

export interface UserAccessibility {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
}

export interface LearnerProfile {
  id: string;
  name: string;
  stage: LearnerStage;
  country: string;
  curriculum: Curriculum;
  gradeLevel: string; // 'PP1', 'PP2', 'Grade 1', 'Grade 7', 'Grade 10', 'Bachelor Year 2', etc.
  seniorPathway?: SeniorPathway;
  advanceTrack?: AdvanceTrack;
  institutionOrCompany?: string;
  avatarUrl: string;
  enrolledCourseIds: string[];
  learningStreakDays: number;
  dailyGoalMinutes: number;
  completedMinutesToday: number;
  accessibility: UserAccessibility;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  stage: LearnerStage;
  curriculum: Curriculum;
  gradeLevel: string;
  subject: string;
  description: string;
  bannerColor: string;
  badgeText: string;
  estimatedHours: number;
  objectives: string[];
  prerequisites: string[];
  chapters: Chapter[];
  exam?: CourseExam;
  isCompulsoryCBC?: boolean;
  isInternationalComparison?: boolean;
  seniorPathway?: SeniorPathway;
  advanceTrack?: AdvanceTrack;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  order: number;
  description: string;
  lessons: Lesson[];
}

export type ActivityType = 'matching' | 'ordering' | 'fill-blank' | 'interactive-choice';

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface InteractiveActivity {
  id: string;
  type: ActivityType;
  title: string;
  instructions: string;
  data: {
    matchingPairs?: MatchingPair[];
    orderingItems?: { id: string; text: string; correctOrder: number }[];
    fillBlankTemplate?: string;
    blankSolutions?: string[];
    choices?: { id: string; label: string; isCorrect: boolean; feedback: string }[];
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  misconceptions: Record<number, string>; // explanation for why that distractor is wrong
  learningObjective: string;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  order: number;
  durationMinutes: number;
  objectives: string[];
  prerequisites: string[]; // lesson IDs required before starting
  videoUrl?: string;
  videoTitle?: string;
  videoDurationSec?: number;
  notesMarkdown: string;
  activities: InteractiveActivity[];
  quizQuestions: QuizQuestion[];
  masteryThresholdPercent: number; // default: 80
}

export interface LessonMasteryState {
  lessonId: string;
  isCompleted: boolean;
  isMastered: boolean;
  scorePercent: number;
  attemptsCount: number;
  lastAttemptDate?: string;
  identifiedMisconceptions: string[];
  remedialActivitiesCompleted: boolean;
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface CourseExam {
  id: string;
  courseId: string;
  title: string;
  passingScorePercent: number;
  durationMinutes: number;
  questions: ExamQuestion[];
}

export interface CertificateRecord {
  id: string;
  credentialId: string;
  courseId: string;
  courseTitle: string;
  recipientName: string;
  stage: LearnerStage;
  gradeLevel: string;
  curriculum: Curriculum;
  issuedDate: string;
  scorePercent: number;
  authority: string;
  verified: boolean;
  seniorPathway?: SeniorPathway;
}

export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  courseId: string;
  stage: LearnerStage;
  dueDate: string;
  urgency: 'urgent' | 'medium' | 'normal';
  status: 'pending' | 'in_progress' | 'completed';
  type: 'quiz' | 'assignment' | 'reading' | 'revision' | 'exam';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  stage: LearnerStage;
  type: 'deadline' | 'feedback' | 'mastery' | 'community' | 'system' | 'certification';
  date: string;
  unread: boolean;
  actionUrl?: string;
}

export type LibraryMaterialType =
  | 'curriculum_guides'
  | 'textbooks'
  | 'stories'
  | 'exam_samples'
  | 'course_materials'
  | 'open_catalog';

export type LibraryCurriculumGroup =
  | 'kenya_cbc'
  | 'african_curricula'
  | 'international'
  | 'multi_curriculum';

export interface LibraryResource {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  description?: string;
  coverImageUrl?: string;
  language?: string;
  accessType?: 'read_online' | 'download' | 'external';
  verifiedAt?: string;
  catalogueUpdatedAt?: string;
  recordUrl?: string;
  keywords?: string[];
  catalogueSource?: 'curated' | 'api';
  gradeLabel?: string;
  intendedAudience?: string;
  provider: string;
  url: string;
  levels: LearnerStage[];
  curriculumGroup: LibraryCurriculumGroup;
  curriculumLabel: string;
  subjects: string[];
  materialTypes: LibraryMaterialType[];
  accessLabel: string;
  accessNote: string;
  licenseLabel: string;
  isOfficial: boolean;
  isSaved?: boolean;
}

export interface BlogPostComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string;
  content: string;
  timestamp: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  status?: 'published' | 'hidden';
  likesCount: number;
  hasLiked?: boolean;
}

export interface BlogPost {
  id: string;
  authorId?: string;
  authorAvatarUrl?: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  authorRole: 'learner' | 'educator' | 'curriculum_advisor' | 'mentor' | 'professional';
  authorStage: LearnerStage;
  authorGrade: string;
  category: 'Subject Insights' | 'Study Hacks' | 'CBC Guides' | 'Tech & Innovation' | 'Career & University';
  stage: LearnerStage;
  subjectTag: string;
  tags?: string[];
  imageUrl?: string;
  status?: 'draft' | 'published' | 'hidden';
  coverGradient: string;
  readTimeMinutes: number;
  timestamp: string;
  likesCount: number;
  commentsCount?: number;
  hasLiked?: boolean;
  comments: BlogPostComment[];
  isUserPost?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
}

export interface LiveTranscriptSession {
  id: string;
  title: string;
  courseTitle: string;
  stage: 'advance' | 'university' | 'professionals';
  date: string;
  durationSeconds: number;
  transcript: string;
  summary?: string;
  actionItems?: string[];
}

import type { ExamQuestion, QuizQuestion, LessonMasteryState, ExamAttemptRecord, CertificateRecord, AssignmentSubmissionStatus } from '../types';
import { firebaseAuth } from '../lib/firebase';
type LessonResult = { scorePercent: number; results: Record<string, { correct: boolean; feedback?: string; correctAnswerIndex?: number }>; progress: LessonMasteryState; courseMasteryPercent: number; courseCompleted: boolean; cycle: number };
type ExamResult = { scorePercent: number; passed: boolean; passingScorePercent: number; results: Record<string, { correct: boolean; correctAnswerIndex?: number; explanation?: string }>; attempt: ExamAttemptRecord & { cycle: number; trusted: true }; cycle: number; alreadySubmitted?: boolean };
type CourseStatus = { cycle: number; courseCompleted: boolean; courseMasteryPercent: number; lessonProgress: Record<string, LessonMasteryState>; lessonAttempts: Record<string, { answers: Record<string, number>; scorePercent: number; submittedAt: string }>; lessonActivities: Record<string, Record<string, { scorePercent: number; passed: boolean; feedback: string; answer?: { pairs?: Record<string, string>; order?: string[]; response?: string; choiceId?: string } }>>; examAttempts: Array<ExamAttemptRecord & { cycle: number; trusted: true }>; examHistory: Array<ExamAttemptRecord & { cycle: number; trusted: true }>; assignments: Record<string, unknown>; examAttempted: boolean; examPassed: boolean };
async function request<T>(path: string, body?: unknown): Promise<T> {
 const user=firebaseAuth?.currentUser; if(!user) throw new Error('Please sign in to access secure learning records.');
 const token=await user.getIdToken(); let response:Response;
 try { response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}); }
 catch { throw new Error('Could not connect to Berry. Check your internet connection.'); }
 const payload=await response.json().catch(()=>({})) as {error?:string;unmet?:string[]}&T;
 if(!response.ok) throw new Error([payload.error,...(payload.unmet||[])].filter(Boolean).join(' — ')||'Secure learning request failed.');
 return payload;
}
export const getLessonAssessment=(courseId:string,lessonId:string)=>request<{questions:QuizQuestion[]}>(`/api/assessments/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/questions`).then(x=>x.questions);
export const submitLessonAssessment=(courseId:string,lessonId:string,answers:Record<string,number>)=>request<LessonResult>(`/api/assessments/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/submit`,{answers});
export type InteractiveActivityAnswer =
  | { pairs: Record<string, string> }
  | { order: string[] }
  | { response: string }
  | { choiceId: string };
export const submitInteractiveActivity = (
  courseId: string,
  lessonId: string,
  activityId: string,
  answer: InteractiveActivityAnswer,
) => request<{
  submission: { scorePercent: number; passed: boolean; feedback: string };
  interactiveScorePercent: number;
  interactiveActivitiesCompleted: number;
  lessonCompleted: boolean;
  progress: LessonMasteryState;
}>(`/api/assessments/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/activities/${encodeURIComponent(activityId)}/submit`, { answer });
export const getCourseExam=(courseId:string)=>request<{questions:ExamQuestion[];cycle:number;expiresAt:string}>(`/api/assessments/courses/${encodeURIComponent(courseId)}/exam/questions`);
export const submitCourseExam=(courseId:string,answers:Record<string,number>)=>request<ExamResult>(`/api/assessments/courses/${encodeURIComponent(courseId)}/exam/submit`,{answers});
export const getCourseStatus=(courseId:string)=>request<CourseStatus>(`/api/learning/courses/${encodeURIComponent(courseId)}/status`);
export const enrollInCourse = (courseId: string) => request<{ enrolled: true; courseId: string }>(`/api/learning/courses/${encodeURIComponent(courseId)}/enroll`, {});
export const startCourseRetake=(courseId:string)=>request<{courseId:string;cycle:number;message:string}>(`/api/learning/courses/${encodeURIComponent(courseId)}/retake`,{});
export const issueTrustedCertificate=(courseId:string)=>request<{eligible:true;certificate:CertificateRecord}>(`/api/certificates/courses/${encodeURIComponent(courseId)}/issue`,{});
export const submitTrustedAssignment=(courseId:string,assignmentId:string,content:string)=>request<{submission:unknown;marking:{status:AssignmentSubmissionStatus;scorePercent:number;marksAwarded:number;totalMarks:number;markerFeedback:string;criterionScores:{criterionId:string;awarded:number;outOf:number}[]}}>(`/api/assignments/courses/${encodeURIComponent(courseId)}/${encodeURIComponent(assignmentId)}/submit`,{content});

export const loadTrustedCertificates=()=>request<{certificates:CertificateRecord[]}>(`/api/certificates/mine`).then(x=>x.certificates);

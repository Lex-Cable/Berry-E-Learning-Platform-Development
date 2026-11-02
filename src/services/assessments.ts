import type { ExamQuestion, QuizQuestion } from '../types';
import { firebaseAuth } from '../lib/firebase';
type LessonResult = { scorePercent: number; results: Record<string, { correct: boolean; feedback?: string; correctAnswerIndex?: number }> };
type ExamResult = { scorePercent: number; passed: boolean; results: Record<string, { correct: boolean; correctAnswerIndex?: number; explanation?: string }> };
async function request<T>(path: string, body?: unknown): Promise<T> {
 const user=firebaseAuth?.currentUser; if(!user) throw new Error('Please sign in to access assessments.');
 const token=await user.getIdToken(); let response:Response;
 try { response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}); }
 catch { throw new Error('Could not connect to Berry. Check your internet connection.'); }
 const payload=await response.json().catch(()=>({})) as {error?:string}&T;
 if(!response.ok) throw new Error(payload.error||'Assessment service request failed.');
 return payload;
}
export const getLessonAssessment=(courseId:string,lessonId:string)=>request<{questions:QuizQuestion[]}>(`/api/assessments/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/questions`).then(x=>x.questions);
export const submitLessonAssessment=(courseId:string,lessonId:string,answers:Record<string,number>)=>request<LessonResult>(`/api/assessments/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/submit`,{answers});
export const getCourseExam=(courseId:string)=>request<{questions:ExamQuestion[]}>(`/api/assessments/courses/${encodeURIComponent(courseId)}/exam/questions`).then(x=>x.questions);
export const submitCourseExam=(courseId:string,answers:Record<string,number>)=>request<ExamResult>(`/api/assessments/courses/${encodeURIComponent(courseId)}/exam/submit`,{answers});

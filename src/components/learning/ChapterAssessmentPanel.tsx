import React, { useState } from 'react';
import { Award, CheckCircle2, Play, Send, Lock } from 'lucide-react';
import { getChapterAssessment, submitChapterAssessment, type ChapterAssessmentAttempt } from '../../services/assessments';
import type { Chapter } from '../../types';

type Question = { id: string; question: string; options: string[]; topic?: string };
interface Props { courseId: string; chapter: Chapter; attempts: ChapterAssessmentAttempt[]; onAttemptSaved: (attempt: ChapterAssessmentAttempt) => void; }

export const ChapterAssessmentPanel: React.FC<Props> = ({ courseId, chapter, attempts, onAttemptSaved }) => {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [answers,setAnswers]=useState<Record<string,number>>({});
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<ChapterAssessmentAttempt|null>(null);
  const history=attempts.filter((attempt)=>attempt.chapterId===chapter.id).sort((a,b)=>a.attemptNumber-b.attemptNumber);
  const passed=history.some((attempt)=>attempt.passed&&attempt.scorePercent>=70);
  const remaining=Math.max(0,3-history.length);
  const start=async()=>{setLoading(true);setError('');setResult(null);setAnswers({});try{const session=await getChapterAssessment(courseId,chapter.id);setQuestions(session.questions);setOpen(true);}catch(e){setError(e instanceof Error?e.message:'Unable to open the chapter assessment.');}finally{setLoading(false);}};
  const submit=async()=>{if(Object.keys(answers).length!==questions.length){setError('Answer every question before submitting.');return;}setSubmitting(true);setError('');try{const response=await submitChapterAssessment(courseId,chapter.id,answers);setResult(response.attempt);onAttemptSaved(response.attempt);setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Unable to submit the chapter assessment.');}finally{setSubmitting(false);}};
  return <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Award size={17} className="text-sky-700"/><div><h5 className="text-sm font-extrabold text-slate-900">Chapter assessment</h5><p className="text-[11px] text-slate-600">Pass mark 70% · 3 attempts maximum</p></div></div>{passed?<span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14}/> Passed</span>:<span className="text-xs text-slate-600">{remaining} attempt(s) remaining</span>}</div>
  {history.map((attempt)=><div key={attempt.id} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2"><span>Attempt {attempt.attemptNumber} · {new Date(attempt.submittedAt).toLocaleDateString()}</span><strong className={attempt.passed?'text-emerald-700':'text-rose-700'}>{attempt.scorePercent}% · {attempt.passed?'Passed':'Not passed'}</strong></div>)}
  {result&&<div className="space-y-2"><p className="text-sm font-bold">Latest result: {result.scorePercent}% — {result.passed?'Chapter passed':'Not passed'}</p>{questions.map((question,index)=>{const feedback=result.results?.[question.id];if(!feedback)return null;return <div key={question.id} className="rounded-xl bg-white border border-slate-200 p-3 text-xs space-y-1"><p className="font-bold text-slate-800">{index+1}. {question.question}</p><p className={feedback.correct?'text-emerald-700':'text-rose-700'}>{feedback.correct?'Correct':'Incorrect'} · Correct answer: {question.options[feedback.correctAnswerIndex]}</p><p className="text-slate-600">{feedback.explanation}</p></div>;})}</div>}
  {open&&<div className="space-y-4">{questions.map((question,index)=><div key={question.id} className="bg-white rounded-xl p-3 space-y-2"><p className="text-xs font-bold text-slate-800">{index+1}. {question.question}</p>{question.options.map((option,optionIndex)=><button key={optionIndex} type="button" onClick={()=>setAnswers(old=>({...old,[question.id]:optionIndex}))} className={`w-full text-left rounded-lg border p-2 text-xs ${answers[question.id]===optionIndex?'border-sky-500 bg-sky-50 text-sky-900':'border-slate-200 bg-white text-slate-700'}`}>{option}</button>)}</div>)}<button type="button" disabled={submitting} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send size={14}/>{submitting?'Submitting securely…':'Submit chapter assessment'}</button></div>}
  {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
  {!open&&!passed&&remaining>0&&<button type="button" disabled={loading} onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Play size={14}/>{loading?'Preparing assessment…':'Start chapter assessment'}</button>}
  {!open&&!passed&&remaining===0&&<p className="text-xs text-rose-700 flex items-center gap-2"><Lock size={14}/> Attempt limit reached. Contact your instructor for review.</p>}
  {passed&&<p className="text-xs text-emerald-700">This chapter assessment is passed and recorded. The module examination will unlock when all other chapter requirements are met.</p>}</section>;
};

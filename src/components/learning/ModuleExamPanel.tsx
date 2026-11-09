import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Lock, Play, Send } from 'lucide-react';
import { getModuleExam, submitModuleExam, type ModuleExamAttempt } from '../../services/assessments';
import type { CourseModule } from '../../types';

type Question = { id: string; question: string; options: string[]; topic?: string };
interface Props { courseId: string; module: CourseModule; attempts: ModuleExamAttempt[]; onAttemptSaved: (attempt: ModuleExamAttempt) => void; }

export const ModuleExamPanel: React.FC<Props> = ({ courseId, module, attempts, onAttemptSaved }) => {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ModuleExamAttempt | null>(null);
  const moduleAttempts = attempts.filter((attempt) => attempt.moduleId === module.id).sort((a,b) => a.attemptNumber-b.attemptNumber);
  const passed = moduleAttempts.some((attempt) => attempt.passed && attempt.scorePercent >= 60);
  const maximumAttempts = module.examination?.maximumAttempts ?? 2;
  const remaining = Math.max(0, maximumAttempts - moduleAttempts.length);

  const start = async () => {
    setLoading(true); setError(''); setResult(null); setAnswers({});
    try { const session = await getModuleExam(courseId, module.id); setQuestions(session.questions); setOpen(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to open the module examination.'); }
    finally { setLoading(false); }
  };
  const submit = async () => {
    if (Object.keys(answers).length !== questions.length) { setError('Answer every question before submitting.'); return; }
    setSubmitting(true); setError('');
    try { const response = await submitModuleExam(courseId, module.id, answers); setResult(response.attempt); onAttemptSaved(response.attempt); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit the examination.'); }
    finally { setSubmitting(false); }
  };

  return <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Award size={17} className="text-indigo-700"/><div><h5 className="text-sm font-extrabold text-slate-900">{module.examination?.title || 'Module examination'}</h5><p className="text-[11px] text-slate-600">Pass mark 60% · {maximumAttempts} attempts maximum</p></div></div>{passed ? <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14}/> Passed</span> : <span className="text-xs text-slate-600">{remaining} attempt(s) remaining</span>}</div>
    {moduleAttempts.map((attempt) => <div key={attempt.id} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2"><span>Attempt {attempt.attemptNumber} · {new Date(attempt.submittedAt).toLocaleDateString()}</span><strong className={attempt.passed ? 'text-emerald-700' : 'text-rose-700'}>{attempt.scorePercent}% · {attempt.passed ? 'Passed' : 'Not passed'}</strong></div>)}
    {result && <div className="space-y-3"><p className="text-sm font-bold">Latest result: {result.scorePercent}% — {result.passed ? 'Module passed' : 'Not passed'}</p><div className="space-y-2">{questions.map((question,index) => { const feedback = result.results?.[question.id]; if (!feedback) return null; return <div key={question.id} className="rounded-xl bg-white border border-slate-200 p-3 text-xs space-y-1"><p className="font-bold text-slate-800">{index+1}. {question.question}</p><p className={feedback.correct?'text-emerald-700':'text-rose-700'}>{feedback.correct?'Correct':'Incorrect'} · Correct answer: {question.options[feedback.correctAnswerIndex]}</p><p className="text-slate-600">{feedback.explanation}</p></div>; })}</div></div>}
    {open && <div className="space-y-4">{questions.map((question,index)=><div key={question.id} className="bg-white rounded-xl p-3 space-y-2"><p className="text-xs font-bold text-slate-800">{index+1}. {question.question}</p>{question.options.map((option,optionIndex)=><button key={optionIndex} type="button" onClick={()=>setAnswers(old=>({...old,[question.id]:optionIndex}))} className={`w-full text-left rounded-lg border p-2 text-xs ${answers[question.id]===optionIndex?'border-indigo-500 bg-indigo-50 text-indigo-900':'border-slate-200 bg-white text-slate-700'}`}>{option}</button>)}</div>)}<button type="button" disabled={submitting} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send size={14}/>{submitting?'Submitting securely…':'Submit examination'}</button></div>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {!open && !passed && remaining > 0 && <button type="button" disabled={loading} onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Play size={14}/>{loading?'Preparing examination…':'Start module examination'}</button>}
    {!open && !passed && remaining === 0 && <p className="text-xs text-rose-700 flex items-center gap-2"><Lock size={14}/> Attempt limit reached. Contact your instructor for review.</p>}
    {passed && <p className="text-xs text-emerald-700">This module examination is recorded as passed. The next module can now unlock.</p>}
  </section>;
};

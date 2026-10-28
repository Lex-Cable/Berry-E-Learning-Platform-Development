import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Save,
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  Clock,
  History,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { LearnerStage, LiveTranscriptSession } from '../../types';
import { isLiveTranscriptionAllowed } from '../../utils/mastery';

interface LiveTranscriptionViewProps {
  stage: LearnerStage;
  sessions: LiveTranscriptSession[];
  onSaveSession: (session: LiveTranscriptSession) => void;
}

export const LiveTranscriptionView: React.FC<LiveTranscriptionViewProps> = ({
  stage,
  sessions,
  onSaveSession,
}) => {
  const isAllowed = isLiveTranscriptionAllowed(stage);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('University Lecture: Advanced Computational Complexity');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Timer during recording
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Recognition may already have stopped.
        }
      }
    };
  }, []);

  // Keep hooks above this stage-specific early return to preserve hook order.
  if (!isAllowed) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Feature Restricted: Higher Education & Workplace Only
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Live Lecture Speech Transcription is strictly designated for <strong>Berry University</strong> and <strong>Berry Professionals</strong> learners attending academic lectures, research symposiums, and professional seminars. It is not enabled for Berry Junior or Senior School curricula.
        </p>
      </div>
    );
  }

  // Speech recognition initialization with browser Web Speech API
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setRecordingError(null);
    setInterimText('');
    setRecordingSeconds(0);
    setAiSummary(null);
    setSummaryError(null);

    if (!SpeechRecognition) {
      setRecordingError(
        'Live speech recognition is not supported by this browser. Try the latest version of Chrome or Edge, or type/paste your notes into the transcript editor.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setCurrentText((prev) => (prev ? prev + ' ' + text : text));
          } else {
            interimTranscript += text;
          }
        }
        setInterimText(interimTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        const error = String(event.error || 'unknown');
        console.warn('Speech recognition status:', error);
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(error)) {
          setRecordingError(
            error === 'not-allowed' || error === 'service-not-allowed'
              ? 'Microphone access was denied. Allow microphone access in your browser settings and try again.'
              : error === 'audio-capture'
                ? 'No microphone was detected. Connect a microphone and try again.'
                : 'The speech recognition service is unavailable. Check your connection and try again.'
          );
          setIsRecording(false);
          setIsPaused(false);
        }
      };

      recognition.onend = () => {
        setInterimText('');
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.warn('Could not start speech recognition', error);
      setRecordingError('Could not start speech recognition. Check microphone permissions and try again.');
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    setIsPaused(!isPaused);
    if (recognitionRef.current) {
      try {
        if (!isPaused) recognitionRef.current.stop();
        else recognitionRef.current.start();
      } catch (err) {}
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setInterimText('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
  };

  const handleSaveTranscript = () => {
    if (!currentText.trim()) return;

    const newSession: LiveTranscriptSession = {
      id: `trans-${Date.now()}`,
      title: sessionTitle,
      courseTitle: stage === 'university' ? 'CS 201: Data Structures' : 'Applied Data Analysis & AI',
      stage: stage as 'university' | 'professionals',
      date: new Date().toISOString().split('T')[0],
      durationSeconds: recordingSeconds,
      transcript: currentText,
      summary: aiSummary || undefined,
    };

    onSaveSession(newSession);
    alert('Lecture transcript saved to your historical sessions!');
  };

  const handleCopyTranscript = () => {
    navigator.clipboard?.writeText(currentText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleExportMarkdown = () => {
    const content = `# ${sessionTitle}\n**Date:** ${new Date().toLocaleDateString()}\n**Stage:** ${stage}\n\n## Transcript\n${currentText}\n\n${aiSummary ? `## AI Summary\n${aiSummary}` : ''}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/\s+/g, '_')}.md`;
    a.click();
  };

  const handleGenerateSummary = async () => {
    if (!currentText.trim() || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const res = await fetch('/api/ai/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentText,
          title: sessionTitle,
          stage,
        }),
      });

      if (!res.ok) throw new Error('Summary generation failed');
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (e) {
      setSummaryError(
        'The AI summary service could not be reached. Your transcript is still available; check your connection and try again.'
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold mb-2">
            <Mic size={14} className="text-cyan-700" />
            <span>Real-Time Academic Speech-to-Text ({stage.toUpperCase()})</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Live Lecture Transcription
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Live audio-to-text capture for university lectures and professional workshops with automated AI summaries and action item extraction.
          </p>
        </div>

        {/* Live Timer Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-mono font-bold text-sm shadow">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording && !isPaused ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{formatTimer(recordingSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Main Live Recording Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Session / Lecture Title:
          </label>
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="w-full text-xs md:text-sm font-bold text-slate-900 p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all active:scale-95"
              >
                <Mic size={16} />
                <span>Start Transcription</span>
              </button>
            ) : (
              <>
                <button
                  onClick={pauseRecording}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                >
                  {isPaused ? <Play size={15} /> : <Pause size={15} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-colors"
                >
                  <Square size={15} />
                  <span>Stop Recording</span>
                </button>
              </>
            )}
          </div>

          {/* Transcript Utility Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              disabled={!currentText.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {copiedNotice ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedNotice ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              disabled={!currentText.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export (.md)</span>
            </button>

            <button
              onClick={handleSaveTranscript}
              disabled={!currentText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              <span>Save Session</span>
            </button>
          </div>
        </div>

        {/* Live Text Area */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Live Word Stream</span>
            <span>{currentText ? currentText.trim().split(/\s+/).length : 0} words</span>
          </div>

          {recordingError && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {recordingError}
            </div>
          )}
          <textarea
            value={interimText ? `${currentText}${currentText ? ' ' : ''}${interimText}` : currentText}
            onChange={(e) => {
              setCurrentText(e.target.value);
              setInterimText('');
            }}
            placeholder="Live spoken lecture audio will transcribe here in real-time. You can edit, format, or annotate during or after the session..."
            rows={10}
            className="w-full text-xs md:text-sm leading-relaxed p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-slate-800"
          />
        </div>

        {/* AI Lecture Summary Section */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" />
              <span>AI Lecture Digest & Action Items</span>
            </h4>

            <button
              onClick={handleGenerateSummary}
              disabled={!currentText.trim() || isSummarizing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{isSummarizing ? 'Analyzing Transcript...' : 'Generate AI Summary'}</span>
            </button>
          </div>

          {summaryError && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {summaryError}
            </div>
          )}
          {aiSummary && (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-line space-y-2">
              {aiSummary}
            </div>
          )}
        </div>
      </div>

      {/* Historical Transcript Archive */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <History size={16} className="text-purple-600" />
          <span>Saved Transcript Archive</span>
        </h3>

        <div className="space-y-3">
          {sessions.map((ses) => (
            <div
              key={ses.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm">{ses.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    {ses.courseTitle} • {ses.date} • {Math.round(ses.durationSeconds / 60)} mins
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentText(ses.transcript);
                    setSessionTitle(ses.title);
                    if (ses.summary) setAiSummary(ses.summary);
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  Load into Editor →
                </button>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                "{ses.transcript}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

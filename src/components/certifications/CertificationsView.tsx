import React, { useState } from 'react';
import {
  Award,
  ShieldCheck,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  X,
  Share2,
} from 'lucide-react';
import { CertificateRecord, Course, LearnerProfile } from '../../types';

interface CertificationsViewProps {
  learner: LearnerProfile;
  courses: Course[];
  certificates: CertificateRecord[];
  onNavigateToCourses: () => void;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  learner,
  courses,
  certificates,
  onNavigateToCourses,
}) => {
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCredentialId = async (cert: CertificateRecord) => {
    try {
      await navigator.clipboard.writeText(cert.credentialId);
      setCopiedId(cert.credentialId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt('Copy this Berry credential ID:', cert.credentialId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Berry Learning Records</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Berry Certificates
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Digital credentials earned through demonstrated competency and mastery exams across Kenya CBC, Higher Education, and Professional tracks.
          </p>
        </div>

        <button
          onClick={onNavigateToCourses}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex-shrink-0"
        >
          <BookOpen size={16} />
          <span>Unlock More Certificates</span>
        </button>
      </div>

      {/* Earned Certificates Grid */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
          <Award size={20} className="text-amber-500" />
          <span>Earned Certificates ({certificates.length})</span>
        </h3>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <Award size={40} className="mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700">No certificates unlocked yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Complete your course chapters and pass the Grade Final Exam with 75% or higher to earn an official credential!
            </p>
            <button
              onClick={onNavigateToCourses}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs hover:bg-purple-700 mt-2"
            >
              Go to My Learning
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                onClick={() => setSelectedCert(cert)}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col group"
              >
                {/* Certificate Card Header */}
                <div className="p-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-950 text-white relative flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      <ShieldCheck size={12} />
                      <span>Berry-issued Record</span>
                    </div>
                    <span className="text-[10px] text-white/70 font-mono">
                      {cert.credentialId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                      {cert.gradeLevel} • {cert.curriculum === 'kenya_cbc' ? 'Kenyan CBC' : 'International'}
                    </span>
                    <h4 className="font-black text-base text-white leading-tight line-clamp-2 mt-1">
                      {cert.courseTitle}
                    </h4>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Recipient:</span>
                      <strong className="text-slate-800">{cert.recipientName}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Exam Score:</span>
                      <span className="font-bold text-emerald-600">{cert.scorePercent}% Mastery</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Issued:</span>
                      <span className="text-slate-700">{cert.issuedDate}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-800">
                    <span>View Certificate Record</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================================
          HIGH-FIDELITY OFFICIAL CERTIFICATE MODAL
          ========================================= */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 space-y-6 relative flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Official Printable Certificate Layout */}
            <div
              id="printable-certificate"
              className="p-8 sm:p-12 rounded-3xl border-4 border-double border-amber-300 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 text-center space-y-6 relative overflow-hidden"
            >
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <span className="text-8xl font-black text-slate-900 tracking-widest">
                  BERRY CBC
                </span>
              </div>

              {/* Certificate Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 text-white font-black text-2xl shadow-md mx-auto">
                  B
                </div>
                <h4 className="text-xs font-black tracking-widest uppercase text-purple-700">
                  BERRY LEARNING PLATFORM • LEARNING RECORD
                </h4>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif">
                  Certificate of Completion & Mastery
                </h2>
                <div className="w-24 h-1 bg-amber-400 mx-auto rounded-full mt-2" />
              </div>

              {/* Statement */}
              <div className="space-y-3 max-w-xl mx-auto text-xs sm:text-sm text-slate-600">
                <p>This is to certify that</p>
                <p className="text-2xl sm:text-3xl font-black text-purple-900 underline decoration-amber-300 underline-offset-8">
                  {selectedCert.recipientName}
                </p>
                <p>
                  has successfully demonstrated rigorous learning mastery and completed all foundational requirements for
                </p>
                <p className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedCert.courseTitle}
                </p>
                <p className="text-xs text-slate-500">
                  Kenya CBC Stage: <strong>{selectedCert.gradeLevel}</strong> • Demonstrated Examination Score: <strong>{selectedCert.scorePercent}%</strong>
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-amber-200/80 text-xs">
                <div className="text-left">
                  <div className="font-script text-lg text-slate-800 font-bold">
                    Berry Learning Platform
                  </div>
                  <span className="text-[11px] text-slate-500 block border-t border-slate-300 pt-1">
                    Learning Achievement Record
                  </span>
                </div>

                <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500 flex items-center justify-center text-center p-1 text-[9px] font-bold text-amber-700">
                  BERRY RECORD
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs text-slate-700 font-bold">
                    {selectedCert.credentialId}
                  </div>
                  <span className="text-[11px] text-slate-500 block border-t border-slate-300 pt-1">
                    Issued: {selectedCert.issuedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleCopyCredentialId(selectedCert)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copiedId === selectedCert.credentialId ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-600">Copied Credential ID!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Credential ID</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

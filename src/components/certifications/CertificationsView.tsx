import React, { useState } from 'react';
import { Award, ShieldCheck, Printer, Copy, Check, BookOpen, ArrowRight, X } from 'lucide-react';
import type { CertificateRecord, Course, LearnerProfile } from '../../types';

interface CertificationsViewProps {
  learner: LearnerProfile;
  courses: Course[];
  certificates: CertificateRecord[];
  onNavigateToCourses: () => void;
}

export const CertificationsView: React.FC<CertificationsViewProps> = ({
  certificates,
  onNavigateToCourses,
}) => {
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCredentialId = async (cert: CertificateRecord) => {
    try {
      await navigator.clipboard.writeText(cert.credentialId);
      setCopiedId(cert.credentialId);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt('Copy this Berry credential ID:', cert.credentialId);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <ShieldCheck size={14} /><span>Berry Learning Records</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Berry Certificates</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Digital learning records earned by completing the course requirements and demonstrating mastery. Berry records are not external qualifications.
          </p>
        </div>
        <button onClick={onNavigateToCourses} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all">
          <BookOpen size={16} /><span>Unlock More Certificates</span>
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
          <Award size={20} className="text-amber-500" /><span>Earned Certificates ({certificates.length})</span>
        </h3>
        {certificates.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <Award size={40} className="mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700">No certificates unlocked yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">Complete all required course activities and pass the final assessment to earn a Berry learning record.</p>
            <button onClick={onNavigateToCourses} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold mt-2">Go to My Learning</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <button key={cert.id} type="button" onClick={() => setSelectedCert(cert)} className="text-left bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col group">
                <div className="p-6 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-950 text-white relative flex flex-col justify-between h-44">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Berry-issued Record</span>
                    <span className="text-[10px] text-white/70 font-mono">{cert.credentialId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">{cert.gradeLevel} • {cert.curriculum === 'kenya_cbc' ? 'Kenyan CBC' : 'International'}</span>
                    <h4 className="font-black text-base text-white leading-tight line-clamp-2 mt-1">{cert.courseTitle}</h4>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500"><span>Recipient:</span><strong className="text-slate-800">{cert.recipientName}</strong></div>
                    <div className="flex items-center justify-between text-slate-500"><span>Overall Score:</span><span className="font-bold text-emerald-600">{cert.scorePercent}% · {cert.grade || 'Grade pending'}</span></div>
                    <div className="flex items-center justify-between text-slate-500"><span>Issued:</span><span className="text-slate-700">{cert.issuedDate}</span></div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-800">
                    <span>View Certificate Record</span><ArrowRight size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCert && (
        <div className="certificate-modal fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="certificate-dialog bg-white rounded-3xl w-full max-w-5xl p-3 sm:p-6 shadow-2xl relative my-auto">
            <button aria-label="Close certificate" onClick={() => setSelectedCert(null)} className="certificate-close absolute -top-2 -right-2 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-sm"><X size={18} /></button>

            <div id="printable-certificate" className="berry-certificate relative overflow-hidden bg-white text-center">
              <div className="berry-certificate-watermark" aria-hidden="true">BERRY CBC</div>
              <div className="berry-certificate-content">
                <div className="berry-mark" aria-label="Berry">B</div>
                <p className="berry-eyebrow">BERRY LEARNING PLATFORM • LEARNING RECORD</p>
                <h1 className="berry-heading">Certificate of Completion &amp; Mastery</h1>
                <div className="berry-gold-rule" />

                <div className="berry-recipient-block">
                  <p className="berry-certify">This is to certify that</p>
                  <h2 className="berry-recipient">{selectedCert.recipientName}</h2>
                  <p className="berry-description">has successfully demonstrated rigorous learning mastery and completed all foundational requirements for</p>
                  <h3 className="berry-course-title">{selectedCert.courseTitle}</h3>
                  <p className="berry-score-line">{selectedCert.curriculum === 'kenya_cbc' ? 'Kenya CBC' : selectedCert.curriculum.replaceAll('_', ' ')} Stage: <strong>{selectedCert.gradeLevel}</strong> <span>•</span> Weighted Achievement Score: <strong>{selectedCert.scorePercent}%</strong> <span>•</span> Grade: <strong>{selectedCert.grade || '—'} · {selectedCert.classification || '—'}</strong></p>
                </div>

                <div className="berry-certificate-footer">
                  <div className="berry-platform-signature">
                    <strong>Berry Learning Platform</strong>
                    <span>Learning Achievement Record</span>
                  </div>
                  <div className="berry-record-seal"><span>BERRY<br />RECORD</span></div>
                  <div className="berry-qr"><img alt="QR code for public certificate verification" loading="lazy" src={`https://quickchart.io/qr?size=140&margin=1&text=${encodeURIComponent(window.location.origin + (selectedCert.verificationUrl || `/api/certificates/verify/${selectedCert.credentialId}`))}`}/><span>Scan to verify</span></div>
                  <div className="berry-credential">
                    <strong>{selectedCert.credentialId}</strong>
                    <span>Issued: {selectedCert.issuedDate}</span>
                    <a href={selectedCert.verificationUrl || `/api/certificates/verify/${selectedCert.credentialId}`} target="_blank" rel="noreferrer" className="text-[10px] text-purple-700 underline">Verify online</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="certificate-actions flex flex-wrap items-center justify-between gap-3 pt-4">
              <button onClick={() => handleCopyCredentialId(selectedCert)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
                {copiedId === selectedCert.credentialId ? <><Check size={14} className="text-emerald-600" /><span className="text-emerald-600">Copied Credential ID!</span></> : <><Copy size={14} /><span>Copy Credential ID</span></>}
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md">
                <Printer size={15} /><span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .berry-certificate {
          min-height: 570px;
          aspect-ratio: 1.22 / 1;
          border: 3px double #fbbf24;
          border-radius: 25px;
          padding: clamp(22px, 4.8vw, 50px) clamp(18px, 5.5vw, 58px);
          color: #172033;
          isolation: isolate;
        }
        .berry-certificate-content { position: relative; z-index: 1; min-height: 100%; display: flex; flex-direction: column; align-items: center; }
        .berry-certificate-watermark { position: absolute; z-index: 0; left: 0; right: 0; top: 43%; transform: translateY(-50%); font-size: clamp(48px, 11vw, 94px); line-height: 1; font-weight: 900; letter-spacing: .13em; color: #172033; opacity: .045; white-space: nowrap; pointer-events: none; }
        .berry-mark { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 17px; background: #a000f5; color: white; font-size: 25px; font-weight: 900; box-shadow: 0 5px 12px #a000f52b; margin-bottom: 10px; }
        .berry-eyebrow { color: #9700e8; font-size: 11px; font-weight: 900; letter-spacing: .14em; margin: 0 0 8px; }
        .berry-heading { color: #111a2d; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(24px, 3.8vw, 32px); line-height: 1.15; font-weight: 700; letter-spacing: -.035em; margin: 0; }
        .berry-gold-rule { width: 96px; height: 4px; border-radius: 9px; background: #fbbf24; margin: 10px auto 25px; }
        .berry-recipient-block { width: 100%; max-width: 760px; display: flex; flex-direction: column; align-items: center; }
        .berry-certify { font-size: 13px; color: #64748b; margin: 0 0 16px; }
        .berry-recipient { color: #5b1594; font-size: clamp(23px, 4vw, 30px); font-weight: 900; line-height: 1.2; border-bottom: 4px solid #fbbf24; padding: 0 8px 4px; margin: 0 0 10px; overflow-wrap: anywhere; }
        .berry-description { max-width: 620px; font-size: 13px; line-height: 1.55; color: #64748b; margin: 0 0 12px; }
        .berry-course-title { color: #172033; font-size: clamp(15px, 2.2vw, 18px); font-weight: 800; line-height: 1.35; margin: 0 0 14px; }
        .berry-score-line { font-size: 11px; color: #718096; margin: 0; }
        .berry-score-line strong { color: #64748b; }
        .berry-score-line span { padding: 0 3px; }
        .berry-certificate-footer { width: 100%; margin-top: auto; padding-top: 30px; display: grid; grid-template-columns: 1fr 64px 64px 1fr; align-items: center; gap: 18px; border-top: 1px solid #f1e4c4; text-align: left; }
        .berry-platform-signature, .berry-credential { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .berry-platform-signature strong { font-size: 16px; color: #263247; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; width: fit-content; }
        .berry-platform-signature span, .berry-credential span { font-size: 10px; color: #718096; }
        .berry-record-seal { width: 58px; height: 58px; border: 2px dashed #f59e0b; border-radius: 50%; display: grid; place-items: center; text-align: center; color: #b45309; font-size: 9px; font-weight: 800; line-height: 1.2; justify-self: center; }
        .berry-qr { display: flex; flex-direction: column; align-items: center; gap: 2px; justify-self: center; }
        .berry-qr img { width: 58px; height: 58px; image-rendering: pixelated; }
        .berry-qr span { font-size: 7px; color: #64748b; white-space: nowrap; }
        .berry-credential { text-align: right; overflow-wrap: anywhere; }
        .berry-credential strong { color: #475569; font-size: 10px; text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 640px) {
          .berry-certificate { min-height: 0; aspect-ratio: auto; padding: 22px 14px; }
          .berry-certificate-watermark { top: 44%; font-size: 42px; }
          .berry-eyebrow { font-size: 8px; letter-spacing: .1em; }
          .berry-certificate-footer { grid-template-columns: 1fr 42px 42px 1fr; gap: 7px; padding-top: 20px; }
          .berry-platform-signature strong { font-size: 11px; }
          .berry-platform-signature span, .berry-credential span { font-size: 8px; }
          .berry-record-seal { width: 40px; height: 40px; font-size: 6px; }
          .berry-qr img { width: 40px; height: 40px; }
          .berry-qr span { font-size: 6px; }
          .berry-credential strong { font-size: 8px; }
        }
        @media print {
          @page { size: landscape; margin: 8mm; }
          body * { visibility: hidden !important; }
          #printable-certificate, #printable-certificate * { visibility: visible !important; }
          #printable-certificate { position: fixed !important; inset: 0 !important; width: 100% !important; height: auto !important; min-height: 0 !important; aspect-ratio: 1.22 / 1 !important; border-radius: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .certificate-modal, .certificate-dialog { position: static !important; display: block !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; box-shadow: none !important; border: 0 !important; }
          .certificate-actions, .certificate-close { display: none !important; }
        }
      `}</style>
    </div>
  );
};

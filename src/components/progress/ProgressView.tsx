import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Compass,
  ArrowRight,
  ShieldCheck,
  Star,
  FileCheck2,
} from 'lucide-react';
import { LearnerProfile, Course, LessonMasteryState } from '../../types';

interface ProgressViewProps {
  learner: LearnerProfile;
  courses: Course[];
  masteryRecords: Record<string, LessonMasteryState>;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  learner,
  courses,
  masteryRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'career'>('analytics');

  const recordsArray = Object.values(masteryRecords);
  const masteredCount = recordsArray.filter((r) => r.isMastered).length;
  const inProgressCount = recordsArray.filter((r) => !r.isMastered && r.attemptsCount > 0).length;
  const totalTrackedObjectives = recordsArray.length;
  const masteryPercentage = totalTrackedObjectives
    ? Math.round((masteredCount / totalTrackedObjectives) * 100)
    : 0;

  // Stage-specific Career Exploration Data
  const careerPathwaysMap: Record<
    string,
    { title: string; badge: string; desc: string; skills: string[]; icon: string }[]
  > = {
    early: [
      {
        title: 'Young Safari Explorer & Animal Friend',
        badge: 'Playful Early Years',
        desc: 'Discovering nature, counting animals, and learning shapes and sounds in Kenya!',
        skills: ['Animal names', 'Counting 1-10', 'Rainbow colors'],
        icon: '🦁',
      },
      {
        title: 'Creative Storyteller & Little Artist',
        badge: 'Creative Arts PP1/PP2',
        desc: 'Drawing shapes, listening to phonics sounds, and singing joyful songs.',
        skills: ['Letter sounds', 'Shape drawing', 'Rhythm & music'],
        icon: '🎨',
      },
    ],
    junior: [
      {
        title: 'Agricultural & Environmental Scientist',
        badge: 'CBC Food Security Focus',
        desc: 'Explore organic crop science, sustainable dairy farming, and Kenya’s biodiversity.',
        skills: ['Soil pH analysis', 'Water harvesting', 'Plant cell microscopy'],
        icon: '🌱',
      },
      {
        title: 'Aviation & Aeronautical Engineer',
        badge: 'STEM Pathway',
        desc: 'Design aircraft aerodynamics, drone navigation systems, and radar communications.',
        skills: ['Geometry & angles', 'Forces & drag', 'Computing fundamentals'],
        icon: '✈️',
      },
      {
        title: 'Digital Health Specialist & Physician',
        badge: 'Biomedical Focus',
        desc: 'Advance medical diagnosis, community healthcare access, and telemedicine tools.',
        skills: ['Human anatomy', 'Cell biology', 'Data records'],
        icon: '🩺',
      },
    ],
    senior: [
      {
        title: 'Senior School STEM Pathway (Science, Tech, Engineering, Math)',
        badge: 'Official KICD CBC Pathway',
        desc: 'Focus on advanced Physics, Chemistry, Biology, Calculus, and Computer Studies for engineering and medicine university entry.',
        skills: ['Atomic orbitals', 'Calculus integration', 'Algorithmic logic'],
        icon: '🔬',
      },
      {
        title: 'Social Sciences & Humanities Pathway',
        badge: 'KICD CBC Pathway',
        desc: 'Focus on Economics, Geography, History, Kiswahili Literature, Law, and International Relations.',
        skills: ['Policy analysis', 'Comparative governance', 'Advanced rhetoric'],
        icon: '⚖️',
      },
      {
        title: 'Arts & Sports Science Pathway',
        badge: 'KICD CBC Pathway',
        desc: 'Specialized disciplines in Athletic Science, Kinesiology, Visual Arts, Music Production, and Graphic Design.',
        skills: ['Biomechanics', 'Acoustic production', 'Visual media'],
        icon: '🎨',
      },
    ],
    university: [
      {
        title: 'Algorithmic Systems Engineer & Research Scientist',
        badge: 'Undergraduate Honours Track',
        desc: 'Theoretical computing, distributed databases, cryptography, and asymptotic runtime engineering.',
        skills: ['Dynamic programming', 'Distributed consensus', 'Complexity proofs'],
        icon: '💻',
      },
      {
        title: 'Quantitative Finance & Risk Modeler',
        badge: 'Actuarial Track',
        desc: 'Stochastic calculus, derivative pricing, enterprise risk modeling, and econometrics.',
        skills: ['Monte Carlo simulation', 'Time-series forecasting', 'Loss distributions'],
        icon: '📈',
      },
    ],
    professionals: [
      {
        title: 'Lead Machine Learning Architect',
        badge: 'Berry Verified Industry Competency',
        desc: 'Scalable production inference, cost-weighted optimization, and ethical AI enterprise governance.',
        skills: ['MLOps pipelines', 'Concept drift mitigation', 'Explainability (SHAP)'],
        icon: '🤖',
      },
      {
        title: 'Certified Financial Operations Controller',
        badge: 'CPA & IFRS Certified Track',
        desc: 'Corporate auditing, tax regulation compliance, and balance-sheet financial controls.',
        skills: ['IFRS 9 modeling', 'Internal audit controls', 'Treasury risk'],
        icon: '📊',
      },
    ],
    advance: [
      {
        title: 'Principal Machine Learning & AI Architect',
        badge: 'Berry Verified Industry Competency',
        desc: 'Enterprise predictive pipelines, cost-weighted loss matrices, and ethical AI safeguards.',
        skills: ['MLOps pipelines', 'Concept drift mitigation', 'Explainability (SHAP)'],
        icon: '🤖',
      },
      {
        title: 'Theoretical Computer Scientist & Systems Researcher',
        badge: 'Higher Ed Research Track',
        desc: 'Advanced algorithmic complexity, distributed consensus, and balanced trees.',
        skills: ['Dynamic programming', 'Distributed consensus', 'Complexity proofs'],
        icon: '💻',
      },
    ],
  };

  const careerPathways = careerPathwaysMap[learner.stage] || careerPathwaysMap.junior;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <BarChart3 size={14} className="text-purple-600" />
            <span>Mastery Analytics & Career Trajectories</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            My Learning Progress & Pathways
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Evaluate your demonstrated subject mastery against CBC benchmarks, and explore stage-aligned career trajectories.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mastery Analytics
          </button>
          <button
            onClick={() => setActiveTab('career')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'career'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Career Development
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500">Demonstrated Mastery</span>
              <div className="text-3xl font-black text-emerald-600">
                {masteredCount} / {totalTrackedObjectives}
              </div>
              <p className="text-[11px] text-slate-400">Achieved ≥80% on assessment criteria</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500">In Active Practice</span>
              <div className="text-3xl font-black text-amber-500">{inProgressCount}</div>
              <p className="text-[11px] text-slate-400">Diagnostic feedback and guided revision</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500">Learning Consistency</span>
              <div className="text-3xl font-black text-purple-600">{learner.learningStreakDays} Days</div>
              <p className="text-[11px] text-slate-400">Daily learning habit maintained</p>
            </div>
          </div>

          {/* Demonstrated Mastery vs Raw Completion Distinction Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-600" />
                <span>Demonstrated Understanding vs Simple Video Attendance</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">Core Berry Principle</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unlike platforms that grant completion certificates merely for playing videos or clicking "next", Berry verifies that you can solve problems, classify misconceptions, and apply principles independently.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Demonstrated Competency (Assessments Passed ≥80%)</span>
                  <span className="text-emerald-700 font-bold">
                    {masteryPercentage}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${masteryPercentage}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Course Material Exploration (Notes & Video Attendance)</span>
                  <span className="text-purple-700 font-bold">75%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-3/4" />
                </div>
              </div>
            </div>
          </div>

          {/* Learning Objectives Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Subject Competency Audit</h3>
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                      {course.badgeText}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs md:text-sm mt-1">{course.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {course.chapters[0]?.lessons.length} Lessons • {course.estimatedHours} Estimated Hours
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Competency Verified</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Career Development Tab */}
      {activeTab === 'career' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 md:p-8 shadow-lg space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold border border-white/20">
              <Briefcase size={14} />
              <span>Career Trajectories ({learner.stage.toUpperCase()})</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              Stage-Aligned Career & Subject Pathways
            </h3>
            <p className="text-xs text-white/80 max-w-xl">
              Connecting what you study today with secondary school combinations, higher education programmes, and industry professional competencies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {careerPathways.map((career, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-2xl flex items-center justify-center">
                    {career.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {career.badge}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-2 leading-snug">
                      {career.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{career.desc}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Core Competencies:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {career.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

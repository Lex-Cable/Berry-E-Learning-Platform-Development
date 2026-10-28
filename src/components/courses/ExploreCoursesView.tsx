import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Layers,
  Globe2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { Course, LearnerProfile, LearnerStage, Curriculum } from '../../types';
import { KENYA_CBC_LEVELS } from '../../utils/mastery';

interface ExploreCoursesViewProps {
  courses: Course[];
  learner: LearnerProfile;
  onSelectCourse: (course: Course) => void;
  onOpenLesson: (course: Course, lessonId: string) => void;
  onOpenCourse: (course: Course) => void;
  onEnrollCourse: (courseId: string) => void;
}

export const ExploreCoursesView: React.FC<ExploreCoursesViewProps> = ({
  courses,
  learner,
  onSelectCourse,
  onOpenLesson,
  onOpenCourse,
  onEnrollCourse,
}) => {
  const [selectedStage, setSelectedStage] = useState<LearnerStage | 'all'>(learner.stage);
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | 'all'>(learner.curriculum);
  const [selectedGrade, setSelectedGrade] = useState<string>(learner.gradeLevel);

  const stageGrades = useMemo(() => {
    if (selectedStage === 'early') return ['PP1', 'PP2'];
    if (selectedStage === 'junior') return Array.from({ length: 9 }, (_, index) => `Grade ${index + 1}`);
    if (selectedStage === 'senior') return ['Grade 10', 'Grade 11', 'Grade 12'];
    return Array.from(new Set(courses
      .filter((course) => course.stage === 'advance' || course.stage === 'university' || course.stage === 'professionals')
      .map((course) => course.gradeLevel))).sort((a, b) => a.localeCompare(b));
  }, [courses, selectedStage]);

  useEffect(() => {
    if (selectedGrade !== 'all' && !stageGrades.includes(selectedGrade)) {
      setSelectedGrade(stageGrades.includes(learner.gradeLevel) ? learner.gradeLevel : stageGrades[0] || 'all');
    }
  }, [learner.gradeLevel, selectedGrade, stageGrades]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCurriculumComparison, setShowCurriculumComparison] = useState(false);

  // Available curricula
  const curricula = [
    { id: 'kenya_cbc' as Curriculum, name: 'Kenya CBC (CBC-aligned)', flag: '🇰🇪' },
    { id: 'cambridge' as Curriculum, name: 'Cambridge International (CIE)', flag: '🌐' },
    { id: 'uk_national' as Curriculum, name: 'England National Curriculum', flag: '🇬🇧' },
    { id: 'us_common_core' as Curriculum, name: 'US State Standards / Common Core', flag: '🇺🇸' },
    { id: 'ib' as Curriculum, name: 'International Baccalaureate (IB)', flag: '🏛️' },
  ];

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    if (selectedStage !== 'all') {
      if (selectedStage === 'advance') {
        if (c.stage !== 'advance' && c.stage !== 'university' && c.stage !== 'professionals') return false;
      } else if (c.stage !== selectedStage) {
        return false;
      }
    }
    if (selectedCurriculum !== 'all' && c.curriculum !== selectedCurriculum && !c.isInternationalComparison) return false;
    if (selectedGrade !== 'all' && c.gradeLevel !== selectedGrade) return false;
    if (
      searchQuery &&
      !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Globe2 size={14} />
            <span>Curriculum Registry & Global Course Catalogue</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Explore Courses & Curricula
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Browse the current Berry catalogue across Kenya CBC and selected international frameworks. Coverage varies by grade, subject and curriculum; available courses are shown in the results.
          </p>
        </div>

        {/* International Comparison Drawer Toggle */}
        <button
          onClick={() => setShowCurriculumComparison(!showCurriculumComparison)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all shadow-sm"
        >
          <Info size={16} />
          <span>{showCurriculumComparison ? 'Hide Curriculum Mapping' : 'Compare Curricula Side-by-Side'}</span>
        </button>
      </div>

      {/* Side-by-Side Curriculum Mapping Info Panel */}
      {showCurriculumComparison && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 text-purple-300">
              <ShieldCheck size={18} />
              <span>Kenyan Competency-Based Curriculum (CBC) Structure & International Equivalence</span>
            </h3>
            <span className="text-xs text-slate-400">Source: KICD Guidelines & UNESCO IBE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 px-3 font-semibold">CBC Education Level</th>
                  <th className="py-2 px-3 font-semibold">CBC Grades (Kenya)</th>
                  <th className="py-2 px-3 font-semibold">UK / Cambridge Equivalent</th>
                  <th className="py-2 px-3 font-semibold">US / International Equivalent</th>
                  <th className="py-2 px-3 font-semibold">Focus Areas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-400">Pre-Primary</td>
                  <td className="py-2.5 px-3">PP1, PP2</td>
                  <td className="py-2.5 px-3">Nursery & Reception</td>
                  <td className="py-2.5 px-3">Pre-K & Kindergarten</td>
                  <td className="py-2.5 px-3">Psychomotor, Creative, Language, Math Activities</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Lower Primary</td>
                  <td className="py-2.5 px-3">Grades 1–3</td>
                  <td className="py-2.5 px-3">Key Stage 1 (Years 1–3)</td>
                  <td className="py-2.5 px-3">Elementary (Grades 1–3)</td>
                  <td className="py-2.5 px-3">Literacy, Kiswahili, English, Math, Environmental</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Upper Primary</td>
                  <td className="py-2.5 px-3">Grades 4–6</td>
                  <td className="py-2.5 px-3">Key Stage 2 (Years 4–6)</td>
                  <td className="py-2.5 px-3">Elementary (Grades 4–6)</td>
                  <td className="py-2.5 px-3">Science & Tech, Agriculture, Social Studies, Arts</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-blue-400">Junior School</td>
                  <td className="py-2.5 px-3">Grades 7–9</td>
                  <td className="py-2.5 px-3">Key Stage 3 (Years 7–9)</td>
                  <td className="py-2.5 px-3">Middle School (Grades 7–9)</td>
                  <td className="py-2.5 px-3">Integrated Science, Pre-Tech, Business, Agriculture</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-purple-400">Senior School</td>
                  <td className="py-2.5 px-3">Grades 10–12</td>
                  <td className="py-2.5 px-3">Key Stage 4/5 & IGCSE/A-Levels</td>
                  <td className="py-2.5 px-3">High School (Grades 10–12)</td>
                  <td className="py-2.5 px-3">STEM, Social Sciences, Arts & Sports Pathways</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            * Berry clearly distinguishes between compulsory national curriculum outcomes and supplementary international enrichment. No foreign curriculum outcome is compulsory for a Kenyan learner unless elected.
          </p>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Stage Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">
            Stage:
          </span>
          {[
            { id: 'early', label: 'Berry Early (PP1-PP2)' },
            { id: 'junior', label: 'Berry Junior (G1-G9)' },
            { id: 'senior', label: 'Berry Senior (G10-G12)' },
            { id: 'advance', label: 'Berry Advance' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                const nextStage = st.id as LearnerStage;
                setSelectedStage(nextStage);
                const nextGrades = courses.filter((course) =>
                  nextStage === 'advance'
                    ? course.stage === 'advance' || course.stage === 'university' || course.stage === 'professionals'
                    : course.stage === nextStage
                ).map((course) => course.gradeLevel);
                setSelectedGrade(nextGrades.includes(learner.gradeLevel) ? learner.gradeLevel : nextGrades[0] || 'all');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedStage === st.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Curriculum & Grade Selector & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Curriculum Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Curriculum System
            </label>
            <select
              value={selectedCurriculum}
              onChange={(e) => setSelectedCurriculum(e.target.value as Curriculum)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {curricula.map((curr) => (
                <option key={curr.id} value={curr.id}>
                  {curr.flag} {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade / Level Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Grade or Qualification
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {stageGrades.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Keyword or Learning Outcome
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chemistry, fractions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const isEnrolled = learner.enrolledCourseIds.includes(course.id);
          const firstLesson = course.chapters[0]?.lessons[0];

          return (
            <div
              key={course.id}
              className="bg-white rounded-3xl border border-slate-200/80 hover:border-purple-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group"
            >
              {/* Card Banner */}
              <div className={`h-24 bg-gradient-to-r ${course.bannerColor} p-4 text-white flex flex-col justify-between relative`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                    {course.code}
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                    {course.gradeLevel}
                  </span>
                </div>
                <h3 className="font-bold text-sm leading-tight text-white/95 line-clamp-1">
                  {course.subject}
                </h3>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 font-semibold">
                    <ShieldCheck size={14} />
                    <span>{course.badgeText}</span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-purple-700 transition-colors">
                    {course.title}
                  </h4>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Chapter breakdown overview */}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen size={13} />
                      <span>{course.chapters.length} Chapters</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      <span>~{course.estimatedHours} hrs</span>
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center gap-2">
                  {isEnrolled ? (
                    <button
                      onClick={() => onOpenCourse(course)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>Continue Learning</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => onEnrollCourse(course.id)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-purple-600 text-white font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>Enroll in Course</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No courses match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try selecting a different grade or curriculum above.</p>
        </div>
      )}
    </div>
  );
};

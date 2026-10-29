import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { LandingPage } from './components/landing/LandingPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ExploreCoursesView } from './components/courses/ExploreCoursesView';
import { MyLearningView } from './components/learning/MyLearningView';
import { CertificationsView } from './components/certifications/CertificationsView';
import { LibraryView } from './components/library/LibraryView';
import { CommunityView } from './components/community/CommunityView';
import { BerryAiView } from './components/ai/BerryAiView';
import { LiveTranscriptionView } from './components/transcription/LiveTranscriptionView';
import { CalendarView } from './components/calendar/CalendarView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ProgressView } from './components/progress/ProgressView';
import { ProfileView } from './components/profile/ProfileView';
import { AssignmentsView } from './components/assignments/AssignmentsView';

import {
  COURSES,
  INITIAL_LEARNER,
  LIBRARY_RESOURCES,
} from './data/curriculumData';

import {
  Course,
  LearnerProfile,
  LearnerStage,
  LessonMasteryState,
  TaskItem,
  AppNotification,
  ExamAttemptRecord,
  AssignmentSubmissionStatus,
  LibraryResource,
  LiveTranscriptSession,
  CertificateRecord,
} from './types';
import { isLiveTranscriptionAllowed, canNavigateBack, popNavigationHistory } from './utils/mastery';
import { firebaseAuth } from './lib/firebase';
import { loadTranscriptSessions, saveTranscriptSession } from './services/transcriptSessions';
import {
  deleteLearnerTask,
  loadAssignmentSubmission,
  loadExamAttempts,
  loadLearnerNotifications,
  loadLearnerTasks,
  saveAssignmentMarking,
  saveAssignmentSubmission,
  saveExamAttempt,
  saveLearnerNotification,
  saveLearnerTask,
} from './services/learnerWorkspace';
import { buildCourseAssignments, markAssignmentSubmission, nextAttemptNumber, type AssignmentMarkingResult } from './utils/assignments';
import { auditCurriculumCoverage, findFallbackLesson } from './utils/curriculumCoverage';
import { certificateEligibilityForCourse, selectBestExamAttempt } from './utils/certificates';
import { loadLearningCertificates, loadLearningProgress, saveLearningCertificate, saveLearningProgress } from './services/learningProgress';
import { getLearnerProfileErrorMessage, getOrCreateLearnerProfile, saveLearnerProfile } from './services/learnerProfile';
import {
  registerBerryUser,
  requestBerryPasswordReset,
  signInBerryUser,
  signOutBerryUser,
} from './services/firebaseAuth';

export default function App() {
  const [learner, setLearner] = useState<LearnerProfile>(INITIAL_LEARNER);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>(LIBRARY_RESOURCES);
  const [transcriptSessions, setTranscriptSessions] = useState<LiveTranscriptSession[]>([]);
  // Only display certificates earned by this learner; seeded sample credentials must not appear as real awards.
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [workspaceLoadedFor, setWorkspaceLoadedFor] = useState<string | null>(null);

  // Exam attempt history, persisted per learner in Firestore.
  const [examAttempts, setExamAttempts] = useState<ExamAttemptRecord[]>([]);
  // Assignment submissions keyed by assignment id.
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<Record<string, {
    content: string;
    attemptNumber: number;
    status: AssignmentSubmissionStatus;
    scorePercent: number;
    marksAwarded: number;
    totalMarks: number;
    markerFeedback: string;
    submittedAt: string;
    criterionScores: { criterionId: string; awarded: number; outOf: number }[];
  }>>({});
  // Real curriculum coverage report recomputed whenever the catalogue changes.
  const coverageReport = useMemo(() => auditCurriculumCoverage(courses), [courses]);
  const assignments = useMemo(() => buildCourseAssignments(courses), [courses]);

  // Auth / Session State (starts logged out on landing page as requested)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authStateReady, setAuthStateReady] = useState(false);
  const [signupStage, setSignupStage] = useState<LearnerStage>('junior');

  // Requirement: "let the 1st always be the landing page"
  const [currentView, setCurrentView] = useState<string>('landing');
  const [history, setHistory] = useState<string[]>([]);

  // Active course and lesson state
  const [activeCourse, setActiveCourse] = useState<Course>(COURSES[0]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [learningTargetCourseId, setLearningTargetCourseId] = useState<string | null>(null);

  // Start with no claimed learning evidence; progress is added by completed learner activities.
  const [masteryRecords, setMasteryRecords] = useState<Record<string, LessonMasteryState>>({});

  // Persist learner activity per profile on this device. This keeps tasks, progress,
  // notifications, transcripts and certificates after refresh without mixing profiles.
  useEffect(() => {
    const storageKey = `berry_workspace_${learner.id}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(saved.tasks)) setTasks(saved.tasks as TaskItem[]);
        if (Array.isArray(saved.notifications)) setNotifications(saved.notifications as AppNotification[]);
        if (Array.isArray(saved.libraryResources)) setLibraryResources(saved.libraryResources as LibraryResource[]);
        if (Array.isArray(saved.transcriptSessions)) setTranscriptSessions(saved.transcriptSessions as LiveTranscriptSession[]);
        if (Array.isArray(saved.certificates)) setCertificates(saved.certificates as CertificateRecord[]);
        if (saved.masteryRecords && typeof saved.masteryRecords === 'object' && !Array.isArray(saved.masteryRecords)) {
          setMasteryRecords(saved.masteryRecords as Record<string, LessonMasteryState>);
        }
      }
    } catch (error) {
      console.warn('Could not load saved Berry workspace data:', error);
    }
    setWorkspaceLoadedFor(learner.id);
  }, [learner.id]);


  // Merge cloud mastery with this device's cache so progress follows a learner across devices.
  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadLearningProgress(uid)
      .then((cloudRecords) => {
        if (cancelled) return;
        setMasteryRecords((current) => ({ ...current, ...cloudRecords }));
      })
      .catch((error) => {
        console.warn('Could not load cloud learning progress; keeping this device cache:', error);
      });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);


  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadLearningCertificates(uid).then((cloudCertificates) => {
      if (cancelled || cloudCertificates.length === 0) return;
      setCertificates((current) => [
        ...cloudCertificates,
        ...current.filter((item) => !cloudCertificates.some((cloudItem) => cloudItem.id === item.id)),
      ]);
    }).catch((error) => {
      console.warn('Could not load cloud learning certificates; keeping this device cache:', error);
    });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);

  // Merge cloud task list with this device's cache so the planner follows the learner.
  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadLearnerTasks(uid)
      .then((cloudTasks) => {
        if (cancelled || cloudTasks.length === 0) return;
        setTasks((current) => {
          const merged = [...current];
          cloudTasks.forEach((cloudTask) => {
            const index = merged.findIndex((task) => task.id === cloudTask.id);
            if (index >= 0) merged[index] = cloudTask; else merged.unshift(cloudTask);
          });
          return merged;
        });
      })
      .catch((error) => {
        console.warn('Could not load cloud tasks; keeping this device cache:', error);
      });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);

  // Merge cloud notifications with this device's cache.
  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadLearnerNotifications(uid)
      .then((cloudNotifications) => {
        if (cancelled || cloudNotifications.length === 0) return;
        setNotifications((current) => {
          const merged = [...current];
          cloudNotifications.forEach((cloudNotification) => {
            const index = merged.findIndex((entry) => entry.id === cloudNotification.id);
            if (index >= 0) merged[index] = cloudNotification; else merged.unshift(cloudNotification);
          });
          return merged;
        });
      })
      .catch((error) => {
        console.warn('Could not load cloud notifications; keeping this device cache:', error);
      });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);

  // Load persisted exam attempts and certificate eligibility history.
  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadExamAttempts(uid)
      .then((cloudAttempts) => {
        if (cancelled) return;
        setExamAttempts((current) => {
          const merged = new Map(current.map((attempt) => [attempt.id, attempt]));
          cloudAttempts.forEach((attempt) => merged.set(attempt.id, attempt));
          return Array.from(merged.values());
        });
      })
      .catch((error) => {
        console.warn('Could not load cloud exam attempts:', error);
      });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);

  // Curriculum coverage audit: surface real gaps in the console so maintainers can act.
  useEffect(() => {
    if (coverageReport.issues.length === 0) return;
    console.warn(
      `Berry curriculum coverage audit found ${coverageReport.issues.length} issue(s) in ${coverageReport.coursesWithIssues.length} course(s):`,
      coverageReport.issues,
    );
  }, [coverageReport]);

  // Sync transcript history to the signed-in learner's private Firestore subcollection.
  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!authStateReady || !isLoggedIn || !uid) return;
    let cancelled = false;
    void loadTranscriptSessions(uid)
      .then((savedSessions) => {
        if (cancelled || savedSessions.length === 0) return;
        setTranscriptSessions((current) => [
          ...savedSessions,
          ...current.filter((session) => !savedSessions.some((saved) => saved.id === session.id)),
        ]);
      })
      .catch((error) => {
        console.warn('Could not load cloud transcript history; keeping local sessions:', error);
      });
    return () => { cancelled = true; };
  }, [learner.id, isLoggedIn, authStateReady]);

  useEffect(() => {
    if (workspaceLoadedFor !== learner.id) return;
    const storageKey = `berry_workspace_${learner.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        tasks,
        notifications,
        libraryResources,
        transcriptSessions,
        certificates,
        masteryRecords,
      }));
    } catch (error) {
      console.warn('Could not save Berry workspace data:', error);
    }
  }, [
    learner.id,
    workspaceLoadedFor,
    tasks,
    notifications,
    libraryResources,
    transcriptSessions,
    certificates,
    masteryRecords,
  ]);



  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthStateReady(true);
      return;
    }

    let active = true;
    let authChangeVersion = 0;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!active) return;
      const currentVersion = ++authChangeVersion;
      setIsLoggedIn(Boolean(user));
      if (!user) {
        setLearner(INITIAL_LEARNER);
        setAuthStateReady(true);
        return;
      }

      setAuthStateReady(false);
      try {
        const profile = await getOrCreateLearnerProfile(user.uid, user.displayName);
        if (active && currentVersion === authChangeVersion) setLearner(profile);
      } catch (error) {
        if (active && currentVersion === authChangeVersion) {
          setAuthNotice(getLearnerProfileErrorMessage(error));
          setTimeout(() => setAuthNotice(null), 6000);
        }
      } finally {
        if (active && currentVersion === authChangeVersion) setAuthStateReady(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authStateReady && isLoggedIn && currentView === 'landing') {
      setCurrentView('dashboard');
    }
  }, [authStateReady, currentView, isLoggedIn]);

  // Navigation handlers with historical tracking for Back arrow
  const handleNavigate = (newView: string) => {
    if (newView === currentView) return;
    setHistory((prev) => [...prev, currentView]);
    setCurrentView(newView);
    setMobileMenuOpen(false);
  };

  // Requirement: "alway hava an arrow showing that can let you go back to the previous page"
  const handleNavigateBack = () => {
    const { targetView, nextHistory } = popNavigationHistory(history, 'landing');
    setHistory(nextHistory);
    setCurrentView(targetView);
  };

  // Navigation to auth pages
  const handleGoToLogin = () => {
    handleNavigate('login');
  };

  const handleGoToSignUp = (stage?: LearnerStage) => {
    if (stage) {
      setSignupStage(stage);
    }
    handleNavigate('signup');
  };

  // Requirement: "add the logout feature"
  const handleLogout = async () => {
    try {
      await signOutBerryUser();
    } catch {
      setLogoutNotice('We could not sign you out. Please try again.');
      setTimeout(() => setLogoutNotice(null), 4000);
      return;
    }
    setHistory([]);
    setCurrentView('landing');
    setLogoutNotice('You have successfully logged out of Berry.');
    setTimeout(() => setLogoutNotice(null), 4000);
  };

  // Login handler
  const handleLogin = async (email: string, password: string) => {
    const user = await signInBerryUser(email, password);
    setIsLoggedIn(true);
    let profileLoaded = false;
    try {
      const profile = await getOrCreateLearnerProfile(user.uid, user.displayName);
      setLearner(profile);
      profileLoaded = true;
    } catch (error) {
      setAuthNotice(getLearnerProfileErrorMessage(error));
      setTimeout(() => setAuthNotice(null), 6000);
    }
    const displayName = user.displayName || user.email?.split('@')[0] || 'Learner';
    if (profileLoaded) {
      setAuthNotice(`Welcome back to Berry, ${displayName}!`);
      setTimeout(() => setAuthNotice(null), 4000);
    }
    handleNavigate('dashboard');
  };

  const handleRegister = async (
    email: string,
    password: string,
    profile: Partial<LearnerProfile>
  ) => {
    await registerBerryUser(email, password, profile);
  };

  const handlePasswordReset = (email: string) => requestBerryPasswordReset(email);

  // Complete sign up handler from registration
  const handleCompleteSignUp = (registeredProfile: Partial<LearnerProfile>) => {
    setIsLoggedIn(true);
    setLearner((prev) => ({
      ...prev,
      ...registeredProfile,
      id: firebaseAuth?.currentUser?.uid || prev.id,
    }));
    setAuthNotice(`Welcome to Berry, ${registeredProfile.name || 'Learner'}! Your account is active.`);
    setTimeout(() => setAuthNotice(null), 4000);
    handleNavigate('dashboard');
  };

  const handlePersistLearnerProfile = async (updates: Partial<LearnerProfile>) => {
    const user = firebaseAuth?.currentUser;
    if (!user) throw new Error('Please sign in again before saving learner profile changes.');

    const updatedProfile = { ...learner, ...updates, id: user.uid };
    if (updates.name && updates.name !== user.displayName) {
      await updateProfile(user, { displayName: updates.name.trim() });
    }
    const savedProfile = await saveLearnerProfile(user.uid, updatedProfile, user.displayName);
    setLearner(savedProfile);
  };

  // Handler for stage changes
  const handleUpdateStage = (newStage: LearnerStage) => {
    const stageGradeDefaults: Record<string, string> = {
      early: 'PP1',
      junior: 'Grade 1',
      senior: 'Grade 10',
      advance: 'Bachelor Year 2',
      university: 'Bachelor Year 2',
      professionals: 'Professional',
    };

    const updates = { stage: newStage, gradeLevel: stageGradeDefaults[newStage] || 'Grade 1' };
    setLearner((prev) => ({ ...prev, ...updates }));
    void handlePersistLearnerProfile(updates).catch((error) => {
      setAuthNotice(getLearnerProfileErrorMessage(error));
      setTimeout(() => setAuthNotice(null), 6000);
    });

    // If on live transcription and switched to junior/senior/early, redirect to dashboard
    if (currentView === 'transcription' && !isLiveTranscriptionAllowed(newStage)) {
      handleNavigate('dashboard');
    }
  };

  // Open a specific course from Explore Courses in the learner's own learning workspace.
  const handleOpenCourse = (course: Course) => {
    setActiveCourse(course);
    setActiveLessonId(null);
    setLearningTargetCourseId(course.id);
    handleNavigate('my-learning');
  };

  // Open a specific lesson
  const handleOpenLesson = (course: Course, lessonId: string) => {
    setActiveCourse(course);
    setActiveLessonId(lessonId);
    setLearningTargetCourseId(course.id);
    handleNavigate('my-learning');
  };

  // Save lesson mastery record
  const handleSaveMastery = (record: LessonMasteryState) => {
    setMasteryRecords((prev) => ({
      ...prev,
      [record.lessonId]: record,
    }));
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) {
      void saveLearningProgress(uid, record).catch((error) => {
        console.warn('Could not sync lesson mastery to the cloud; the local record is retained:', error);
      });
    }

    if (record.isMastered) {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: 'Mastery Demonstrated! 🎉',
        message: `You demonstrated genuine understanding with a score of ${record.scorePercent}%! Next lesson unlocked.`,
        stage: learner.stage,
        type: 'mastery',
        date: 'Just now',
        unread: true,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  // Issue a Berry learning record when the full eligibility check passes: a genuine
  // passing exam attempt, complete lesson mastery, and no prior certificate. This is
  // not a government-issued credential.
  const handleClaimCertificate = (course: Course, scorePercent: number) => {
    const requiredScore = course.exam?.passingScorePercent ?? 75;
    if (scorePercent < requiredScore) return;

    const eligibility = certificateEligibilityForCourse(course, masteryRecords, examAttempts, certificates);
    if (!eligibility.eligible) {
      console.info('Certificate not issued yet; outstanding requirements:', eligibility.unmet);
      return;
    }

    const newCert: CertificateRecord = {
      id: `cert-${Date.now()}`,
      credentialId: `BERRY-CBC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      courseId: course.id,
      courseTitle: course.title,
      recipientName: learner.name,
      stage: learner.stage,
      gradeLevel: course.gradeLevel,
      curriculum: course.curriculum,
      issuedDate: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      scorePercent: scorePercent,
      authority: 'Berry Learning Platform',
      verified: false,
    };

    setCertificates((prev) => [newCert, ...prev]);
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) {
      void saveLearningCertificate(uid, newCert).catch((error) => {
        console.warn('Could not sync certificate to the cloud; the local record is retained:', error);
      });
    }

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Berry Certificate Issued! 🎓',
      message: `You scored ${scorePercent}% on the ${course.subject} Final Exam. Your Berry learning record has been issued.`,
      stage: learner.stage,
      type: 'certification',
      date: 'Just now',
      unread: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Persist a completed exam attempt so results survive refreshes and devices, and
  // keep certificate eligibility checks grounded in real attempt history.
  const handleExamAttemptSubmitted = (course: Course, attempt: Omit<ExamAttemptRecord, 'id'>) => {
    const record: ExamAttemptRecord = { ...attempt, id: `attempt-${Date.now()}` };
    setExamAttempts((prev) => [...prev, record]);
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) {
      void saveExamAttempt(uid, record).catch((error) => {
        console.warn('Exam attempt kept locally; cloud sync failed:', error);
      });
    }
    const attemptNotification: AppNotification = {
      id: `notif-exam-${record.id}`,
      title: record.passed ? 'Final exam passed! 🎉' : 'Final exam completed',
      message: record.passed
        ? `You scored ${record.scorePercent}% on the ${course.subject} final exam, above the ${record.passingScorePercent}% threshold.`
        : `You scored ${record.scorePercent}% on the ${course.subject} final exam. The pass mark is ${record.passingScorePercent}%. Review and retake when ready.`,
      stage: learner.stage,
      type: record.passed ? 'certification' : 'system',
      date: 'Just now',
      unread: true,
      actionUrl: 'my-learning',
    };
    setNotifications((prev) => [attemptNotification, ...prev]);
    if (uid) void saveLearnerNotification(uid, attemptNotification).catch(() => undefined);
  };

  // Enroll in course
  const handleEnrollCourse = (courseId: string) => {
    if (!learner.enrolledCourseIds.includes(courseId)) {
      const enrolledCourseIds = [...learner.enrolledCourseIds, courseId];
      setLearner((prev) => ({ ...prev, enrolledCourseIds }));
      void handlePersistLearnerProfile({ enrolledCourseIds }).catch((error) => {
        setAuthNotice(getLearnerProfileErrorMessage(error));
        setTimeout(() => setAuthNotice(null), 6000);
      });
    }
  };

  // Notification handlers
  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, unread: false };
        const uid = firebaseAuth?.currentUser?.uid;
        if (uid) void saveLearnerNotification(uid, updated).catch(() => undefined);
        return updated;
      })
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => {
      const uid = firebaseAuth?.currentUser?.uid;
      prev.filter((n) => n.unread).forEach((notification) => {
        if (uid) void saveLearnerNotification(uid, { ...notification, unread: false }).catch(() => undefined);
      });
      return prev.map((n) => ({ ...n, unread: false }));
    });
  };

  // Task handlers. Every mutation mirrors to Firestore so the planner follows the learner across devices.
  const handleToggleTaskComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated: TaskItem = {
          ...t,
          status: t.status === 'completed' ? 'pending' : 'completed',
        };
        const uid = firebaseAuth?.currentUser?.uid;
        if (uid) void saveLearnerTask(uid, updated).catch((error) => {
          console.warn('Task update kept locally; cloud sync failed:', error);
        });
        return updated;
      })
    );
  };

  const handleAddTask = (newTask: Omit<TaskItem, 'id'>) => {
    const item: TaskItem = {
      ...newTask,
      id: `task-${Date.now()}`,
    };
    setTasks((prev) => [item, ...prev]);
    const scheduledNotification: AppNotification = {
      id: `notif-task-${item.id}`,
      title: 'Study task scheduled',
      message: `“${item.title}” is on your planner for ${new Date(item.dueDate).toLocaleString()}.`,
      stage: item.stage,
      type: 'system',
      date: 'Just now',
      unread: true,
      actionUrl: 'calendar',
    };
    setNotifications((prev) => [scheduledNotification, ...prev]);
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) {
      void saveLearnerTask(uid, item).catch((error) => {
        console.warn('Task saved locally; cloud sync failed:', error);
      });
      void saveLearnerNotification(uid, scheduledNotification).catch(() => undefined);
    }
  };

  const handleUpdateTask = (updatedTask: TaskItem) => {
    setTasks((prev) => prev.map((task) => task.id === updatedTask.id ? updatedTask : task));
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) void saveLearnerTask(uid, updatedTask).catch((error) => {
      console.warn('Task update kept locally; cloud sync failed:', error);
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) void deleteLearnerTask(uid, taskId).catch((error) => {
      console.warn('Task deleted locally; cloud delete failed:', error);
    });
  };

  // Assignment submission handler: mark with the rubric, persist, and notify.
  const handleSubmitAssignment = (assignment: import('./types').Assignment, content: string): AssignmentMarkingResult => {
    const result = markAssignmentSubmission(assignment, content);
    const uid = firebaseAuth?.currentUser?.uid;
    const previous = assignmentSubmissions[assignment.id];
    const submittedAt = new Date().toISOString();
    const attemptNumber = nextAttemptNumber(previous?.attemptNumber ?? 0);

    setAssignmentSubmissions((prev) => ({
      ...prev,
      [assignment.id]: {
        content,
        attemptNumber,
        status: result.status,
        scorePercent: result.scorePercent,
        marksAwarded: result.marksAwarded,
        totalMarks: result.totalMarks,
        markerFeedback: result.markerFeedback,
        submittedAt,
        criterionScores: result.criterionScores,
      },
    }));

    if (uid) {
      const payload = {
        assignmentId: assignment.id,
        content,
        submittedAt,
        attemptNumber,
        status: result.status,
        ...(result.status !== 'submitted'
          ? {
              scorePercent: result.scorePercent,
              markerFeedback: result.markerFeedback,
              gradedAt: submittedAt,
              criterionScores: result.criterionScores,
            }
          : {}),
      };
      const persist = result.status === 'submitted'
        ? saveAssignmentSubmission(uid, payload as Parameters<typeof saveAssignmentSubmission>[1])
        : saveAssignmentMarking(uid, payload as Parameters<typeof saveAssignmentMarking>[1]);
      void persist.catch((error) => {
        console.warn('Assignment submission kept locally; cloud sync failed:', error);
      });
    }

    const feedbackNotification: AppNotification = {
      id: `notif-assignment-${assignment.id}-${attemptNumber}`,
      title: result.status === 'graded' ? 'Assignment marked ✔' : 'Assignment returned for revision',
      message: `${assignment.title}: ${result.marksAwarded}/${result.totalMarks} (${result.scorePercent}%). Open Assignments to read the marker feedback.`,
      stage: learner.stage,
      type: 'feedback',
      date: 'Just now',
      unread: true,
      actionUrl: 'assignments',
    };
    setNotifications((prev) => [feedbackNotification, ...prev]);
    if (uid) void saveLearnerNotification(uid, feedbackNotification).catch(() => undefined);

    return result;
  };

  // Library bookmark handler
  const handleToggleBookmark = (resourceId: string, resource?: LibraryResource) => {
    setLibraryResources((prev) => {
      const exists = prev.some((item) => item.id === resourceId);
      if (exists) {
        return prev.map((item) => item.id === resourceId ? { ...item, isSaved: !item.isSaved } : item);
      }
      return resource ? [...prev, { ...resource, isSaved: true }] : prev;
    });
  };

  // Transcript session handler. Keep local state responsive while syncing to Firestore.
  const handleSaveTranscriptSession = (session: LiveTranscriptSession) => {
    setTranscriptSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
    const uid = firebaseAuth?.currentUser?.uid;
    if (!uid) return;
    void saveTranscriptSession(uid, session).catch((error) => {
      console.warn('Transcript saved locally but cloud sync failed:', error);
      setAuthNotice('Your transcript is saved on this device, but cloud sync failed. Check Firebase configuration and rules.');
      setTimeout(() => setAuthNotice(null), 7000);
    });
  };

  // Accessibility classes
  const fontScaleClass = {
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl',
  }[learner.accessibility.fontSize];

  const dyslexiaClass = learner.accessibility.dyslexiaFont ? 'font-mono' : 'font-sans';
  const contrastClass = learner.accessibility.highContrast
    ? 'contrast-125 saturate-150'
    : '';

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (!authStateReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 text-slate-700">
        <div className="rounded-3xl bg-white px-8 py-6 text-center shadow-lg border border-amber-100">
          <div className="text-3xl mb-2" aria-hidden="true">🍓</div>
          <p className="text-sm font-bold">Loading your Berry learning space…</p>
        </div>
      </div>
    );
  }

  // View: Landing Page (Default 1st view)
  if (currentView === 'landing') {
    return (
      <div className={`${fontScaleClass} ${dyslexiaClass} ${contrastClass}`}>
        {logoutNotice && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>✓ {logoutNotice}</span>
          </div>
        )}
        {authNotice && (
          <div className="fixed top-4 right-4 z-50 bg-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>✓ {authNotice}</span>
          </div>
        )}
        <LandingPage
          onStartLearning={(chosenProfile) => {
            if (isLoggedIn) {
              handleNavigate('dashboard');
            } else {
              handleGoToSignUp(chosenProfile?.stage);
            }
          }}
          onLogin={handleGoToLogin}
          onGoToSignUp={handleGoToSignUp}
          onLogout={handleLogout}
          learner={learner}
          isLoggedIn={isLoggedIn}
          onNavigateBack={handleNavigateBack}
          canGoBack={canNavigateBack(history, currentView)}
        />
      </div>
    );
  }

  // View: Dedicated Sign-Up Page
  if (currentView === 'signup') {
    return (
      <div className={`${fontScaleClass} ${dyslexiaClass} ${contrastClass}`}>
        <SignUpPage
          initialStage={signupStage}
          onRegister={handleRegister}
          onCompleteSignUp={handleCompleteSignUp}
          onGoToLogin={handleGoToLogin}
          onNavigateBack={handleNavigateBack}
        />
      </div>
    );
  }

  // View: Dedicated Log-In Page
  if (currentView === 'login') {
    return (
      <div className={`${fontScaleClass} ${dyslexiaClass} ${contrastClass}`}>
        <LoginPage
          onLogin={handleLogin}
          onPasswordReset={handlePasswordReset}
          onGoToSignUp={() => handleGoToSignUp()}
          onNavigateBack={handleNavigateBack}
        />
      </div>
    );
  }

  // Fallback guard: If logged out and attempting to access internal views, prompt login
  if (!isLoggedIn) {
    return (
      <div className={`${fontScaleClass} ${dyslexiaClass} ${contrastClass}`}>
        <LoginPage
          onLogin={handleLogin}
          onPasswordReset={handlePasswordReset}
          onGoToSignUp={() => handleGoToSignUp()}
          onNavigateBack={() => handleNavigate('landing')}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans ${fontScaleClass} ${dyslexiaClass} ${contrastClass}`}
    >
      {/* Collapsible Stage-Aware Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        stage={learner.stage}
        unreadNotificationsCount={unreadCount}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Navbar with Always-Visible Back Arrow & Logout */}
        <TopNavbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onNavigateBack={handleNavigateBack}
          canGoBack={canNavigateBack(history, currentView)}
          onLogout={handleLogout}
          learner={learner}
          onUpdateStage={handleUpdateStage}
          unreadCount={unreadCount}
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex">
            <div className="w-64 bg-white h-full p-4 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-extrabold text-base text-slate-900">BERRY MENU</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-slate-500"
                >
                  ✕ Close
                </button>
              </div>

              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'my-learning', label: 'My Learning' },
                { id: 'courses', label: 'Explore Courses' },
                { id: 'certifications', label: 'Certifications' },
                { id: 'ai-tutor', label: 'Berry AI Tutor' },
                { id: 'community', label: 'Berry Community' },
                { id: 'library', label: 'Berry Library' },
                ...(isLiveTranscriptionAllowed(learner.stage)
                  ? [{ id: 'transcription', label: 'Live Transcription' }]
                  : []),
                { id: 'calendar', label: 'Calendar & Tasks' },
                { id: 'assignments', label: 'Assignments' },
                { id: 'notifications', label: 'Notifications' },
                { id: 'progress', label: 'Mastery & Progress' },
                { id: 'profile', label: 'Profile & Settings' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold ${
                    currentView === item.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Log Out
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && (
            <DashboardView
              learner={learner}
              courses={courses}
              tasks={tasks}
              notifications={notifications}
              masteryRecords={masteryRecords}
              onSelectCourse={setActiveCourse}
              onOpenLesson={handleOpenLesson}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'my-learning' && (
            <MyLearningView
              learner={learner}
              courses={courses}
              masteryRecords={masteryRecords}
              initialCourseId={learningTargetCourseId}
              onClearInitialCourse={() => setLearningTargetCourseId(null)}
              onSaveMastery={handleSaveMastery}
              onNavigateToCertificates={() => handleNavigate('certifications')}
              onNavigateToCourses={() => handleNavigate('courses')}
              onClaimCertificate={handleClaimCertificate}
              onExamAttemptSubmitted={handleExamAttemptSubmitted}
              examAttempts={examAttempts.filter((attempt) => attempt.courseId === (learningTargetCourseId ?? ''))}
            />
          )}

          {currentView === 'courses' && (
            <ExploreCoursesView
              courses={courses}
              learner={learner}
              onSelectCourse={setActiveCourse}
              onOpenLesson={handleOpenLesson}
              onOpenCourse={handleOpenCourse}
              onEnrollCourse={handleEnrollCourse}
            />
          )}

          {currentView === 'certifications' && (
            <CertificationsView
              learner={learner}
              courses={courses}
              certificates={certificates}
              onNavigateToCourses={() => handleNavigate('my-learning')}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              resources={libraryResources}
              learner={learner}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {currentView === 'community' && (
            <CommunityView learner={learner} />
          )}

          {currentView === 'ai-tutor' && (
            <BerryAiView
              learner={learner}
              courses={courses}
              onOpenLesson={handleOpenLesson}
            />
          )}

          {currentView === 'transcription' && (
            <LiveTranscriptionView
              stage={learner.stage as 'advance' | 'university' | 'professionals'}
              sessions={transcriptSessions}
              onSaveSession={handleSaveTranscriptSession}
            />
          )}

          {currentView === 'assignments' && (
            <AssignmentsView
              learnerName={learner.name}
              assignments={assignments.filter((assignment) => learner.enrolledCourseIds.includes(assignment.courseId))}
              courses={courses}
              submissionState={assignmentSubmissions}
              onSubmit={handleSubmitAssignment}
            />
          )}

          {currentView === 'calendar' && (
            <CalendarView
              tasks={tasks}
              learner={learner}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {currentView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              learner={learner}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'progress' && (
            <ProgressView
              learner={learner}
              courses={courses}
              masteryRecords={masteryRecords}
            />
          )}

          {currentView === 'profile' && (
            <ProfileView
              learner={learner}
              onUpdateProfile={handlePersistLearnerProfile}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  );
}

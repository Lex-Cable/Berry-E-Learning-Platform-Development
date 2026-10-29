Berry — Learn. Grow. Thrive.

A personalized learning platform built to make education more accessible, engaging, and effective.

Berry is an evolving e-learning platform designed to support learners throughout their educational journey, from early childhood and primary school to secondary education, university, professional development, and lifelong learning.

The platform brings together structured learning pathways, interactive lessons, curriculum-aligned content, adaptive assessments, AI-powered learning assistance, educational resources, and community engagement in one connected learning environment.

Berry is built around the individual learner. Its goal is to help each person discover what they need to learn, understand concepts at their own pace, track their progress, strengthen their skills, and work toward meaningful educational goals.

Our Vision

To create an intelligent, inclusive, and engaging learning ecosystem where every learner can discover knowledge, develop practical skills, build confidence, and progress at their own pace.

What Is Berry?

Berry aims to move beyond one-size-fits-all education by making learning more personalized, structured, interactive, and focused on genuine understanding.

Learners should be able to identify what they need to study, access relevant learning materials, practice new concepts, assess their understanding, and receive guidance on what to improve next.

The platform is organized into four learning experiences, each designed for a different stage of the educational journey.

The Four Learning Stages

 1. Berry Ali — Early Childhood Learning

Berry Ali is designed for learners in PP1 and PP2. It introduces foundational concepts through colorful visuals, playful interactions, simple explanations, educational games, and age-appropriate activities.

The experience aims to make early learning enjoyable, accessible, and easy for young children to understand.

 2. Berry Junior — Primary and Junior School

Berry Junior supports learners in Grades 1–9, covering lower primary, upper primary, and junior school.

Its intended learning structure follows Kenya's Competency-Based Curriculum (CBC), organizing subjects and learning materials according to the learner's selected grade.

 3. Berry Senior — Senior School

Berry Senior is designed for learners in Grades 10–12. It focuses on grade-specific subjects, learning pathways, structured lessons, revision materials, assessments, and academic progress.

The experience aims to reflect the learner's selected curriculum and applicable senior-school pathway.

 4. Berry Advanced — University and Professional Learning

Berry Advanced extends the learning experience to university and college students, postgraduate learners, working professionals, job seekers, and lifelong learners.

It is intended to support academic study, professional development, practical skills acquisition, career preparation, and continuous learning through structured courses and educational resources.

Key Features

Berry is being developed around the following core capabilities.

- Personalized Learning: Learning experiences tailored to the learner's educational stage, grade, curriculum, qualification, interests, and goals.
- Structured Courses: Subjects and courses organized into chapters, lessons, activities, assignments, quizzes, and final examinations where applicable.
- Interactive Learning: Engaging learning materials and activities that encourage active participation and practical understanding.
- Mastery-Based Progression: A learning approach focused on demonstrated understanding, constructive feedback, revision, and improvement.
- Explore Courses: A course discovery experience for finding relevant subjects, courses, and learning opportunities.
- My Learning: A personalized learning space for accessing enrolled courses, navigating lessons, and monitoring progress.
- Berry AI: An AI-powered learning assistant intended to explain concepts, guide problem-solving, and recommend relevant learning activities.
- Berry Library: A central resource space for educational materials, references, revision resources, and other permitted learning content.
- Berry Community: A learning-focused community for publishing educational blogs, sharing ideas, commenting, reacting to posts, and engaging with other learners.
- Assignments and Assessments: Tools for completing learning activities, submitting assignments, attempting quizzes, taking examinations, and reviewing feedback.
- Progress Tracking: Insights into course completion, assessment performance, learning objectives, and areas that require further practice.
- Achievements and Certifications: A dedicated space for viewing achievements and certificates supported by the platform.
- Calendar and Notifications: Tools for organizing learning activities, tracking deadlines, and receiving relevant updates.
- Assignment Submission & Marking: Rubric-based written assignments per enrolled course with automated first-pass marking, feedback, and revision resubmission.
- Live Transcription: A planned productivity and learning capability for Berry Advanced university and professional learners.

Feature availability may vary as development progresses.

Curriculum-Centered and Globally Inclusive

Berry uses Kenya's Competency-Based Curriculum as its foundational school-learning pathway for learners studying in Kenya, while aiming to accommodate additional curricula and educational systems over time.

The objective is to present learning content that corresponds to the learner's actual grade, educational pathway, or qualification rather than mixing unrelated subjects and learning materials.

Beyond school education, Berry aims to support learners across different countries, academic disciplines, professional fields, and stages of life.

How Learning Works

Berry is designed around a structured learning hierarchy:

Learning Stage → Grade or Qualification → Subject → Chapter → Lesson → Activity → Assignment → Chapter Quiz → Course Examination

A learner begins by selecting their educational stage and relevant grade or qualification. The platform then presents the subjects or courses associated with that selection.

Within each subject or course, learners can explore chapters, study individual lessons, complete activities and assignments, attempt chapter quizzes, and work toward the final course examination where applicable.

This structure is intended to help learners identify knowledge gaps, revisit challenging concepts, strengthen their understanding, and progress with greater confidence.

Technology and Development

Berry is an evolving software project focused on educational technology, personalized learning, interactive user experiences, and maintainable application architecture.

Its technical direction emphasizes:

- Reusable components and maintainable code.
- Responsive, accessible, and intuitive user interfaces.
- Structured curriculum, subject, and course data.
- Reliable authentication and user permissions.
- Persistent learning progress and assessment records.
- Secure AI integrations and environment configuration.
- Scalable content management and future feature expansion.

The technologies, dependencies, architecture, and integrations currently implemented should be verified against the project repository.

Project Status

Berry is an actively evolving project. Its features, curriculum coverage, integrations, and learning workflows may be at different stages of implementation.

The long-term objective is to build a reliable learning platform in which educational content, interactive lessons, assessments, learner progress, AI assistance, community features, and supporting services work together seamlessly.

The project will continue to evolve as its functionality is implemented, tested, and refined.

The Bigger Picture

Education should not stop at the classroom, and learning should not look the same for everyone.

Berry aims to connect foundational education, academic development, practical skills, and lifelong learning through one adaptable platform.

Whether a child is learning their first numbers, a secondary school student is preparing for examinations, a university student is pursuing a degree, or a professional is developing new skills, Berry's vision is to provide a structured and supportive environment for continued growth.

Berry — where every learning journey has room to grow.

---

Getting Started

Follow these steps to set up Berry on your local development environment.

 Prerequisites

Before you begin, ensure that you have the following installed:

- [Node.js](https://nodejs.org/)
- npm, which is included with Node.js
- Git, for cloning and managing the repository
- A Gemini API key, if required by the application's AI features

 1. Clone the Repository

Replace the repository URL below with the actual URL of your GitHub repository.

```bash
git clone https://github.com/Lex-Cable/Berry-E-Learning-Platform-Development.git
cd Berry-E-Learning-Platform-Development
```

 2. Install Dependencies

Install the packages required to run the project.

```bash
npm install
```

If dependency installation fails, consult the project's current dependency configuration before applying alternative installation options.

 3. Configure Firebase Authentication and Cloud Firestore

Create a Firebase project, register Berry as a Web app, and enable **Email/Password** in Authentication → Sign-in method. Add your local and deployed app domains to Authentication → Settings → Authorized domains.

Create a **Cloud Firestore** database in Firebase Console. The app stores each learner at `users/{Firebase Auth UID}`. Publish the included `firestore.rules` before testing signup or profile saving; the rules let a signed-in learner read and update only their own profile. You can publish them with the Firebase CLI using `firebase deploy --only firestore:rules` after selecting the correct Firebase project, or copy the rules into the Firestore Rules editor in Firebase Console and click **Publish**.

Copy `.env.example` to `.env.local`, then fill in the Firebase web app values from Firebase Console → Project settings → Your apps:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=...
```

The Firebase web configuration identifies the project; authorization is enforced by Firebase Authentication and its security controls. Do not place service-account credentials or private server keys in `VITE_*` variables. Keep `.env.local` out of Git.

If using Berry AI locally, also set `GEMINI_API_KEY` in `.env.local`. Never commit API keys or other server secrets to GitHub.

 4. Start the Development Server

Run the development server using the project's configured npm script.

```bash
npm run dev
```

Open the local development URL displayed in your terminal. In the current project configuration, this is expected to be:

```text
http://localhost:3000
```

Firebase Auth stores the account and display name. Cloud Firestore stores learner stage, country, curriculum, grade, pathway, school or institution, course enrollments, study goal, and accessibility preferences. Existing Auth accounts without a profile document receive a safe default profile at their next sign-in. Community blog posts, private drafts, likes, comments, and reports are stored in Firestore.

Learning activity synchronization: lesson mastery, lesson notes, resume position, certificates, planner tasks (`users/{uid}/learningTasks`), notifications (`users/{uid}/learningNotifications`), assignment submissions (`users/{uid}/assignmentSubmissions`), and final-exam attempts (`users/{uid}/examAttempts`) are stored in Firestore under the signed-in learner's own user document and merged with the device cache on sign-in. Every write is validated by `firestore.rules`; a failed cloud sync keeps the local copy and logs a warning rather than losing learner work.

#### Berry Community setup

The Community feature uses the signed-in Firebase UID as the author identity. Posts and comments are checked against the matching `users/{uid}` profile. Drafts are private to their author, and like/comment counters are changed in the same Firestore transactions as their associated records. User-provided post images are secure HTTPS URLs; Berry does not upload or host image files. The Firebase CLI configuration targets the named Firestore database already selected in `src/lib/firebase.ts`.

Before testing Community in a Firebase project, publish the updated Firestore rules and indexes after confirming that the Firebase CLI points at the intended project:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Reports can only be reviewed by accounts with the Firebase custom claim `moderator: true`. Set that claim from a trusted Admin SDK environment; never grant it from Berry's client or learner profile. Sign out and back in (or refresh the ID token) after the claim is applied. The Community UI provides the moderation queue only to those accounts, and records the reviewer, action, report, and review time.

#### Assignments, exams, and certificates

- **Assignments**: each enrolled course with lessons exposes a rubric-marked writing assignment (`Assignments` page). Submissions are auto-marked against rubric criteria (`src/utils/assignments.ts`), given formative feedback, and either graded (≥50%) or returned for revision. Learners can revise and resubmit; attempts are capped at 20 and persisted in Firestore.
- **Exams**: every completed course exam attempt is persisted (`src/components/learning/MyLearningView.tsx` via `onExamAttemptSubmitted`) with its answers, score, and pass state, and attempt history is shown before retakes.
- **Certificates**: a Berry learning record is issued only when `certificateEligibilityForCourse` passes — a genuine passing exam attempt (score ≥ stored threshold, cross-checked against the stored flag), complete lesson mastery for the course, and no existing certificate for that course. These records are not government-issued qualifications.
- **Curriculum coverage**: `auditCurriculumCoverage` (`src/utils/curriculumCoverage.ts`) detects empty chapters, unresolved lesson prerequisites, duplicate lesson IDs, content-free lessons, and empty exams; issues are surfaced in the console for maintainers. When a saved resume pointer references a lesson that no longer exists, `findFallbackLesson` redirects the learner to the first genuinely accessible lesson.

#### Automated tests

```bash
npm test
```

Runs the Node.js test suites for mastery logic, assignment marking, curriculum coverage auditing, and certificate eligibility. `npm run lint` type-checks the project and `npm run build` produces the production bundle.

 5. Start Developing

Once the application is running, you can explore the existing interface, develop features, refine the learning experience, and test changes locally.

Contributing and Future Development

Berry is being developed with an emphasis on usability, educational value, maintainability, and long-term scalability.

Future development may include expanding curriculum coverage, improving personalization, strengthening assessment workflows, introducing additional educational resources, and enhancing the platform's AI-assisted learning capabilities.

As the project evolves, its documentation should be updated to reflect implemented features, setup requirements, supported learning pathways, and changes to the technical architecture.

Project Philosophy

Berry is guided by three principles:

- Learn: Make knowledge accessible through structured, engaging, and meaningful learning experiences.
- Grow: Help learners build understanding, develop skills, and recognize their progress.
- Thrive: Empower learners to pursue their academic, professional, and personal goals with confidence.

Berry — Learn. Grow. Thrive.

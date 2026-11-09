import type { Course } from '../types';

/**
 * Original Berry-authored starter lessons aligned to the published curriculum
 * structures named in each badge. These are not official Cambridge or Common
 * Core publications, and schools should confirm detailed stage frameworks
 * before treating a lesson as a complete syllabus.
 */
export const INTERNATIONAL_STARTER_COURSES: Course[] = [
  {
    id: 'cambridge-primary-stage-1-mathematics',
    title: 'Cambridge Primary Mathematics: Number and Shape Foundations',
    code: 'CAM-PRI-MATH-1',
    stage: 'junior',
    curriculum: 'cambridge',
    gradeLevel: 'Stage 1',
    subject: 'Mathematics',
    description: 'A Berry-authored introduction to counting, comparing quantities and recognising familiar two-dimensional shapes.',
    bannerColor: 'from-sky-500 via-blue-500 to-indigo-600',
    badgeText: 'Cambridge Primary Mathematics • Stage 1',
    estimatedHours: 2,
    objectives: [
      'Count and compare small groups of objects using one-to-one correspondence.',
      'Describe simple two-dimensional shapes using their visible attributes.',
      'Explain a counting or shape pattern using clear mathematical language.',
    ],
    prerequisites: [],
    chapters: [
      {
        id: 'cam-pri-math-1-ch1',
        courseId: 'cambridge-primary-stage-1-mathematics',
        title: 'Counting and Comparing',
        order: 1,
        description: 'Build number sense by counting real objects and comparing small groups.',
        lessons: [
          {
            id: 'cam-pri-math-1-l1',
            chapterId: 'cam-pri-math-1-ch1',
            title: 'Count carefully and compare groups',
            order: 1,
            durationMinutes: 20,
            objectives: [
              'Count objects once each and say the total.',
              'Use more, fewer and the same number to compare groups.',
            ],
            prerequisites: [],
            notesMarkdown: `## Count each object once

Counting tells us how many objects are in a group. Point to one object as you say each number word. Do not skip an object or count the same object twice.

### Compare two groups

- **More** means one group has a greater number.
- **Fewer** means one group has a smaller number.
- **The same number** means both groups contain an equal number.

### Try it

Imagine 4 red counters and 3 blue counters. Count each group carefully. The red group has **more** counters. The blue group has **fewer** counters.

You can check by matching one red counter with one blue counter. Any red counter left over shows that the red group is larger.`,
            activities: [
              {
                id: 'cam-pri-math-1-act1',
                type: 'interactive-choice',
                title: 'Compare the counters',
                instructions: 'There are 5 red counters and 3 blue counters. Which statement is correct?',
                data: {
                  choices: [
                    { id: 'a', label: 'The red group has more.', isCorrect: true, feedback: 'Correct. Five is greater than three.' },
                    { id: 'b', label: 'The blue group has more.', isCorrect: false, feedback: 'Count both groups again. Five is greater than three.' },
                    { id: 'c', label: 'Both groups have the same number.', isCorrect: false, feedback: 'The groups are not equal: two red counters would be left over.' },
                  ],
                },
              },
            ],
            quizQuestions: [
              {
                id: 'cam-pri-math-1-q1',
                question: 'Which group has fewer objects: 2 stars or 4 circles?',
                options: ['The 2 stars', 'The 4 circles', 'They are equal'],
                correctIndex: 0,
                explanation: 'Two is less than four, so the group of stars has fewer objects.',
                misconceptions: { 1: 'Four is a greater number than two. Try counting each group.' },
                learningObjective: 'Compare quantities using more and fewer.',
              },
            ],
            masteryThresholdPercent: 80,
          },
        ],
      },
      {
        id: 'cam-pri-math-1-ch2',
        courseId: 'cambridge-primary-stage-1-mathematics',
        title: 'Recognising Shapes',
        order: 2,
        description: 'Notice and describe circles, triangles, squares and rectangles.',
        lessons: [
          {
            id: 'cam-pri-math-1-l2',
            chapterId: 'cam-pri-math-1-ch2',
            title: 'Look at the sides and corners',
            order: 1,
            durationMinutes: 20,
            objectives: [
              'Recognise circles, triangles, squares and rectangles.',
              'Describe a shape using sides and corners.',
            ],
            prerequisites: ['cam-pri-math-1-l1'],
            notesMarkdown: `## Shapes are all around us

A **circle** is round and has no straight sides or corners.

A **triangle** has 3 straight sides and 3 corners.

A **square** has 4 equal straight sides and 4 corners.

A **rectangle** has 4 straight sides and 4 corners. Its opposite sides are equal.

### Look around

A clock face may look like a circle. A set square may look like a triangle. A book cover may look like a rectangle.

Turn a shape or make it bigger: it is still the same shape if its defining properties stay the same.`,
            activities: [
              {
                id: 'cam-pri-math-1-act2',
                type: 'interactive-choice',
                title: 'Find the triangle',
                instructions: 'Which shape has exactly three straight sides?',
                data: {
                  choices: [
                    { id: 'a', label: 'Circle', isCorrect: false, feedback: 'A circle has no straight sides.' },
                    { id: 'b', label: 'Triangle', isCorrect: true, feedback: 'Correct. A triangle has three straight sides.' },
                    { id: 'c', label: 'Rectangle', isCorrect: false, feedback: 'A rectangle has four straight sides.' },
                  ],
                },
              },
            ],
            quizQuestions: [
              {
                id: 'cam-pri-math-1-q2',
                question: 'How many corners does a square have?',
                options: ['3', '4', '5'],
                correctIndex: 1,
                explanation: 'A square has four corners and four equal sides.',
                misconceptions: { 0: 'Three corners describe a triangle, not a square.' },
                learningObjective: 'Describe common two-dimensional shapes.',
              },
            ],
            masteryThresholdPercent: 80,
          },
        ],
      },
    ],
    exam: {
      id: 'cam-pri-math-1-exam',
      courseId: 'cambridge-primary-stage-1-mathematics',
      title: 'Number and Shape Foundations Check',
      passingScorePercent: 75,
      durationMinutes: 10,
      questions: [
        {
          id: 'cam-pri-math-1-exam-q1',
          question: 'Which number is greater: 6 or 4?',
          options: ['4', '6', 'They are equal'],
          correctIndex: 1,
          explanation: 'Six is greater than four.',
          topic: 'Comparing quantities',
        },
        {
          id: 'cam-pri-math-1-exam-q2',
          question: 'Which shape has three straight sides?',
          options: ['Circle', 'Triangle', 'Square'],
          correctIndex: 1,
          explanation: 'A triangle has three straight sides.',
          topic: 'Shape recognition',
        },
      ],
    },
  },
  {
    id: 'us-common-core-grade-1-mathematics',
    title: 'Common Core Grade 1 Mathematics: Addition and Subtraction',
    code: 'CCSS-G1-MATH',
    stage: 'junior',
    curriculum: 'us_common_core',
    gradeLevel: 'Grade 1',
    subject: 'Mathematics',
    description: 'Develop addition and subtraction strategies, connect equations to stories and solve problems within 20.',
    bannerColor: 'from-rose-500 via-orange-500 to-amber-500',
    badgeText: 'US Common Core Mathematics • Grade 1',
    estimatedHours: 2,
    objectives: [
      'Represent and solve addition and subtraction word problems within 20.',
      'Use counting on, making ten and related addition-subtraction facts.',
      'Explain how an equation represents a mathematical situation.',
    ],
    prerequisites: [],
    chapters: [
      {
        id: 'ccss-g1-math-ch1',
        courseId: 'us-common-core-grade-1-mathematics',
        title: 'Addition as Putting Together',
        order: 1,
        description: 'Use objects, drawings and equations to solve addition stories.',
        lessons: [
          {
            id: 'ccss-g1-math-l1',
            chapterId: 'ccss-g1-math-ch1',
            title: 'Add by counting on',
            order: 1,
            durationMinutes: 20,
            objectives: [
              'Understand addition as putting together or adding to.',
              'Find a total by counting on from the larger addend.',
            ],
            prerequisites: [],
            notesMarkdown: `## Addition joins amounts

Addition combines two or more amounts to find a total.

For example, if you have 7 pencils and receive 3 more, you can write:

**7 + 3 = 10**

### Count on

Start with the larger number, 7. Say the next three numbers: 8, 9, 10. The answer is 10.

### Try a story problem

There are 8 birds on a fence. Four more birds land. How many birds are there now?

You can draw 8 marks, add 4 marks, and count all 12. You can also start at 8 and count on: 9, 10, 11, 12.

An equation uses numbers and symbols to show the relationship: **8 + 4 = 12**.`,
            activities: [
              {
                id: 'ccss-g1-math-act1',
                type: 'interactive-choice',
                title: 'Solve the bird story',
                instructions: 'There are 6 birds. 3 more arrive. How many birds are there altogether?',
                data: {
                  choices: [
                    { id: 'a', label: '8 birds', isCorrect: false, feedback: 'Start at 6 and count on three numbers: 7, 8, 9.' },
                    { id: 'b', label: '9 birds', isCorrect: true, feedback: 'Correct. 6 + 3 = 9.' },
                    { id: 'c', label: '10 birds', isCorrect: false, feedback: 'Count on exactly three more: 7, 8, 9.' },
                  ],
                },
              },
            ],
            quizQuestions: [
              {
                id: 'ccss-g1-math-q1',
                question: 'What is 8 + 5?',
                options: ['12', '13', '14'],
                correctIndex: 1,
                explanation: 'Count on five from eight: 9, 10, 11, 12, 13.',
                misconceptions: { 0: 'You counted on only four. Start at 8 and say five more numbers.' },
                learningObjective: 'Add within 20 using counting-on strategies.',
              },
            ],
            masteryThresholdPercent: 80,
          },
        ],
      },
      {
        id: 'ccss-g1-math-ch2',
        courseId: 'us-common-core-grade-1-mathematics',
        title: 'Subtraction as Taking Away',
        order: 2,
        description: 'Represent subtraction stories and connect subtraction to addition.',
        lessons: [
          {
            id: 'ccss-g1-math-l2',
            chapterId: 'ccss-g1-math-ch2',
            title: 'Take away and find what remains',
            order: 1,
            durationMinutes: 20,
            objectives: [
              'Understand subtraction as taking apart or taking from.',
              'Solve subtraction situations within 20.',
            ],
            prerequisites: ['ccss-g1-math-l1'],
            notesMarkdown: `## Subtraction takes away

Subtraction tells us how many remain when some objects are taken away.

If 9 apples are on a table and 4 are eaten, write:

**9 - 4 = 5**

You can count backwards four steps from 9: 8, 7, 6, 5.

### Addition and subtraction are connected

If **9 - 4 = 5**, then **5 + 4 = 9**. Addition can help you check subtraction.

### Try a story problem

Ten toy cars are in a box. Three are taken out. How many remain?

Draw ten cars, cross out three, and count the seven that remain.`,
            activities: [
              {
                id: 'ccss-g1-math-act2',
                type: 'interactive-choice',
                title: 'Cars left in the box',
                instructions: 'There are 10 toy cars. 3 are taken out. How many remain?',
                data: {
                  choices: [
                    { id: 'a', label: '6 cars', isCorrect: false, feedback: 'Take away three from ten: 10, 9, 8, 7.' },
                    { id: 'b', label: '7 cars', isCorrect: true, feedback: 'Correct. 10 - 3 = 7.' },
                    { id: 'c', label: '8 cars', isCorrect: false, feedback: 'Three cars are removed, not two.' },
                  ],
                },
              },
            ],
            quizQuestions: [
              {
                id: 'ccss-g1-math-q2',
                question: 'What is 14 - 6?',
                options: ['7', '8', '9'],
                correctIndex: 1,
                explanation: 'Fourteen take away six equals eight.',
                misconceptions: { 0: 'Check by adding: 7 + 6 is 13, not 14.' },
                learningObjective: 'Subtract within 20 and check using addition.',
              },
            ],
            masteryThresholdPercent: 80,
          },
        ],
      },
    ],
    exam: {
      id: 'ccss-g1-math-exam',
      courseId: 'us-common-core-grade-1-mathematics',
      title: 'Addition and Subtraction Within 20 Check',
      passingScorePercent: 75,
      durationMinutes: 10,
      questions: [
        {
          id: 'ccss-g1-math-exam-q1',
          question: 'What is 9 + 6?',
          options: ['14', '15', '16'],
          correctIndex: 1,
          explanation: 'Nine plus six equals fifteen.',
          topic: 'Addition within 20',
        },
        {
          id: 'ccss-g1-math-exam-q2',
          question: 'What is 13 - 5?',
          options: ['7', '8', '9'],
          correctIndex: 1,
          explanation: 'Thirteen take away five equals eight.',
          topic: 'Subtraction within 20',
        },
      ],
    },
  },
];

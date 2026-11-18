'use strict';
/**
 * Lesson Plan BD \u2014 reference data (no user plans ship with the app).
 * Subjects follow the Bangladesh school curriculum (Classes 1-12).
 * Activity ideas are generic, reusable teaching moves \u2014 not lesson content.
 */
const SUBJECTS = [
  'Bangla',
  'English',
  'Mathematics',
  'Science',
  'ICT',
  'Social Science',
  'Religion',
  'Physical Education',
  'Arts & Crafts',
  'General Knowledge',
];

const CLASS_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 4 reusable activity ideas per subject. Inserted into the Activities box. */
const ACTIVITY_IDEAS = {
  'Bangla': [
    'Read the passage aloud together, then ask 3 quick questions',
    'Pair work: students retell the story in their own words',
    'Board race: write new words from the lesson on the board',
    'Dictation of 5 sentences, then peer-check the spelling',
  ],
  'English': [
    'Warm-up: 5-minute pair conversation using the target pattern',
    'Role play the dialogue in pairs, then two pairs perform',
    'Gap-fill worksheet: 10 sentences, check answers together',
    'Exit ticket: each student writes one new sentence',
  ],
  'Mathematics': [
    'Mental-maths sprint: 10 quick questions on the board',
    'Work 3 examples together, then students solve 5 alone',
    'Pair check: partners swap notebooks and mark each other',
    'Word problem from daily life (bazar, bus fare, cricket score)',
  ],
  'Science': [
    'Demo with everyday objects, students predict before you show',
    'Draw and label the diagram in notebooks, then compare',
    'Think-pair-share: why does this happen in daily life?',
    'Quick quiz: 5 true/false questions to close the lesson',
  ],
  'ICT': [
    'Show one screen step at a time, students follow on paper',
    'Pair at the board: one student explains the next step',
    'Safe-practice checklist: what to click and what never to click',
    'Mini task: each student writes the 3 steps from memory',
  ],
  'Social Science': [
    'Map work: locate the places named in the lesson',
    'Group discussion: how does this affect our village or town?',
    'Timeline on the board: students place 5 events in order',
    'Compare past and present: what changed, what stayed the same?',
  ],
  'Religion': [
    'Recite together, then one student recites alone',
    'Discuss the meaning in simple words with a daily-life example',
    'Ask students to share one good deed they did this week',
    'Memorisation in small chunks, repeat after the teacher',
  ],
  'Physical Education': [
    'Warm-up stretches led by the class monitor',
    'Practise the skill in small groups, rotate every 5 minutes',
    'Mini game using the skill from today\u2019s lesson',
    'Cool-down and talk: why do we stretch before playing?',
  ],
  'Arts & Crafts': [
    'Show one finished example, point out 3 details to copy',
    'Step-by-step drawing together on the board',
    'Gallery walk: students show work, class names one good point',
    'Use waste paper and local materials for the craft',
  ],
  'General Knowledge': [
    'Quiz round: 10 quick questions, hands up to answer',
    'Picture cards: match each picture to its name or place',
    'Tell a short true story about today\u2019s topic',
    'Students bring one new fact to share next class',
  ],
};

const LessonData = { SUBJECTS, CLASS_LEVELS, ACTIVITY_IDEAS };

if (typeof module !== 'undefined' && module.exports) module.exports = LessonData;
if (typeof window !== 'undefined') window.LessonData = LessonData;

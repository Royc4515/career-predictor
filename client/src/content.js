// Copy lives here so pages stay about layout and motion.

// don't touch / Option text is the contract with the server: server/quiz.js
// holds the same strings with stable ids, and server/__tests__/quiz.test.js
// imports this file and fails on any difference. Edit both together. Question
// ids are database column names, so they keep their old names even where the
// question changed. Options are quoted back on the report as evidence, so
// they must read well inside quotation marks (no quotes inside them).
export const QUESTIONS = [
  {
    id: 'strength',
    label: 'Under pressure',
    question: 'The demo is in ten minutes and the laptop just died. You…',
    options: [
      'Present from memory. Slides were holding me back',
      'Improvise with a whiteboard and unearned confidence',
      'Fix it with a paperclip and pure spite',
      'Call a guy who knows a guy',
    ],
  },
  {
    id: 'monday_vibe',
    label: 'Mondays',
    question: 'Monday, 9:02 a.m. First move?',
    options: [
      "Third coffee (it's 9:02)",
      'Stare at the wall until lunch',
      'Same as Sunday, honestly',
      'Genuinely love Mondays (liar)',
    ],
  },
  {
    id: 'coworker_desc',
    label: 'Reputation',
    question: 'Your coworkers know you as…',
    options: [
      'The one who can just quickly do it. Again.',
      'The one whose ideas need a translator',
      'Who? We have never met',
      'The one who knows when lunch arrives',
    ],
  },
  {
    id: 'five_year_goal',
    label: 'Five-year plan',
    question: 'Where do you see yourself in five years?',
    options: [
      'Ringing the bell at a stock exchange. Any stock exchange',
      'Somewhere with palm trees and bad Wi-Fi',
      'Same desk. Hopefully.',
      "I can't see past Thursday",
    ],
  },
  {
    id: 'desired_field',
    label: 'Open tabs',
    question: 'You have 47 browser tabs open. Mostly…',
    options: [
      'Pitch decks and an app that is 90% done',
      'Moodboards and fonts I will never pay for',
      'A spreadsheet tracking my other spreadsheets',
      'My own comments section',
    ],
  },
];

// Asked after the five questions. It never changes the career, only which
// version of the portrait is shot, so it is not one of the "five questions"
// in the copy and has no finding. Option text must match server/quiz.js
// PORTRAIT_QUESTION (server/__tests__/quiz.test.js checks it).
export const PORTRAIT_STEP = {
  id: 'portrait_subject',
  label: 'Cover photo',
  question: 'Last one, for the photographer. Who are we shooting?',
  options: ['Shoot me as a woman', 'Shoot me as a man', 'Surprise me. The desk will cast someone', 'Use my own photo'],
};

// The photographer's option that asks for a selfie instead of casting
// someone. Shown only when the deployment can make personal portraits
// (GET /api/features).
export const OWN_PHOTO_OPTION = 'Use my own photo';

// Every screen of the questionnaire, in order.
export const QUIZ_STEPS = [...QUESTIONS, PORTRAIT_STEP];

// The analyst's note printed under each quoted answer in the report's
// "Evidence on file". The joke is the gap between trivial evidence and a
// confident conclusion, so keep them dry: no exclamation marks, no winking.
// Keyed by option text; an answer with no note (an old saved result whose
// option was since reworded) is simply quoted without one.
export const FINDINGS = {
  // The demo is in ten minutes and the laptop just died.
  'Present from memory. Slides were holding me back':
    'Subject confuses having no slides with having a vision. Investors have made the same mistake.',
  'Improvise with a whiteboard and unearned confidence':
    'Confidence exceeded evidence by a ratio our instruments could not display.',
  'Fix it with a paperclip and pure spite': 'Problem solved. Root cause untouched. Promotion unlikely.',
  'Call a guy who knows a guy': 'The guy who knows a guy has also been contacted. He is not available.',
  // Monday, 9:02 a.m.
  "Third coffee (it's 9:02)": 'Consistent with a resting heart rate the desk chose not to measure.',
  'Stare at the wall until lunch': 'Output before noon: unmeasurable. After noon: also unmeasurable.',
  'Same as Sunday, honestly': 'No weekend detected. It may never have been installed.',
  'Genuinely love Mondays (liar)': "Flagged by the desk's lie detector, which was also lying.",
  // Your coworkers know you as...
  'The one who can just quickly do it. Again.': 'Quickly has taken four years so far.',
  'The one whose ideas need a translator': 'Three ideas submitted. None understood. One patented by accident.',
  'Who? We have never met': 'HR confirms you exist. Colleagues do not.',
  'The one who knows when lunch arrives': 'The most reliable data source in the building.',
  // Five years from now.
  'Ringing the bell at a stock exchange. Any stock exchange':
    'Bell located. The stock exchange has not returned our calls.',
  'Somewhere with palm trees and bad Wi-Fi': 'Signal strength consistent with career outlook.',
  'Same desk. Hopefully.': 'Ambition measured at chair height.',
  "I can't see past Thursday": 'Planning horizon: three days. Industry average: also three days.',
  // 47 open tabs.
  'Pitch decks and an app that is 90% done': 'The remaining 10% is projected to take the rest of your life.',
  'Moodboards and fonts I will never pay for': 'The licensing department has been notified.',
  'A spreadsheet tracking my other spreadsheets':
    'The spreadsheets are tracking each other now. Nobody is tracking you.',
  'My own comments section': 'Top comment is yours. So is the second one.',
};

// The report's "Detailed analysis": one row per fake metric, each with a dry
// note picked by how the score came out. `low` applies below 35, `high` from
// 70, `mid` in between. Values come from lib/analysis.js.
export const ANALYSIS_NOTES = {
  dna: {
    low: 'Sample may have been contaminated by optimism.',
    mid: 'The remaining 3% is the part of you that wanted to be a vet.',
    high: 'The remaining 3% is the part of you that wanted to be a vet.',
  },
  market: {
    low: 'The market has been informed and has asked for privacy.',
    mid: 'Viable in at least one market. Not this one.',
    high: 'Strong demand, mostly from you.',
  },
  passion: {
    low: 'Passion located. Alignment pending.',
    mid: 'You care about this more than the job does.',
    high: 'Alarmingly sincere. Monitoring continues.',
  },
  stability: {
    low: 'Stable in the way a Jenga tower is stable.',
    mid: 'Stable until the next reorg.',
    high: 'Suspiciously stable. An audit has been scheduled.',
  },
};

// Real titles from server/careers.js SAMPLE_ANSWERS, same order. Shown
// immediately as text-only covers; /api/samples then adds the portraits.
export const SAMPLE_TITLES = [
  'Founder Waiting for Series A That Will Never Come',
  'JIRA Ticket Archaeologist, Legacy Systems Division',
  'Senior Associate of Quiet Desperation',
  'Senior Falafel Architect, Tel Aviv District',
  'Solo Developer Running on Espresso and Spite',
  'Remote DevOps Engineer Who Blames the Wi-Fi',
  'Thought Leader Without the Thought',
  'Night Shift Security Guard / Aspiring Novelist',
];

// A real sequence, so it is shown as one: each step is checked off in order.
export const PRESS_STEPS = [
  'Interviewing your coworkers',
  'Disregarding their answers',
  'Consulting the table',
  'Skipping the fact-check',
  'Setting your headline',
  'Sending the cover to print',
];

// Browser tab titles, one per page (WCAG 2.4.2): the tab and a screen
// reader's page announcement say where you are, not just the site name.
export const PAGE_TITLES = {
  landing: 'CareerPredict | The Forecast Issue',
  onboarding: 'The questionnaire | CareerPredict',
  loading: 'Printing your cover | CareerPredict',
  result: 'Your cover | CareerPredict',
  issues: 'Your back issues | CareerPredict',
  notFound: 'Page not found | CareerPredict',
};

export const LINKS = {
  linkedin: 'https://www.linkedin.com/in/roy-carmelli/',
  github: 'https://github.com/Royc4515',
  portfolio: 'https://roy-carmelli-portfolio.vercel.app/',
  source: 'https://github.com/Royc4515/career-predictor',
};

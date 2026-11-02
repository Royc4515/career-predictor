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
      'Pitch the vision from memory',
      'Improvise with a whiteboard and confidence',
      'Fix it with a paperclip and pure spite',
      'Call a guy who knows a guy',
    ],
  },
  {
    id: 'monday_vibe',
    label: 'Mondays',
    question: 'Monday, 9:02 a.m. First move?',
    options: [
      'Third coffee',
      'Stare at the wall until lunch',
      'Same as Sunday, honestly',
      'Post something inspiring in the team chat',
    ],
  },
  {
    id: 'coworker_desc',
    label: 'Reputation',
    question: 'Your coworkers know you as…',
    options: [
      'The one who can just quickly do it',
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
      'Ringing the bell at the stock exchange',
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
      'Pitch decks and a half-built app',
      'Moodboards and fonts I will never pay for',
      'Spreadsheets and a stock app',
      'My own comments section',
    ],
  },
];

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

export const LINKS = {
  linkedin: 'https://www.linkedin.com/in/roy-carmelli/',
  github: 'https://github.com/Royc4515',
  portfolio: 'https://roy-carmelli-portfolio.vercel.app/',
  source: 'https://github.com/Royc4515/career-predictor',
};

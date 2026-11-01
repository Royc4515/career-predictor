// Copy lives here so pages stay about layout and motion.

// don't touch / Option strings are matched by substring in mapCareer
// (server/routes/userRoutes.js). Rewording an option silently changes which
// career a user gets. Question text and ids are safe to edit; ids are the
// keys validateOnboardingAnswers expects.
export const QUESTIONS = [
  {
    id: 'strength',
    question: "What's your biggest work strength?",
    options: ['Strategic thinking', 'Raw creativity', "I just don't quit", 'I know people who know people'],
  },
  {
    id: 'monday_vibe',
    question: 'How do you handle Mondays?',
    options: ['IV drip of coffee', 'Quiet suffering', 'Every day feels the same', 'I genuinely love Mondays (liar)'],
  },
  {
    id: 'coworker_desc',
    question: 'Coworkers would describe you as...',
    options: ['The reliable one', 'A visionary (probably)', 'Wait, you have coworkers?', 'The one who orders food'],
  },
  {
    id: 'five_year_goal',
    question: 'Your five-year plan?',
    options: ['CEO or bust', 'Laptop from a beach', 'To still be employed', 'Plans are a social construct'],
  },
  {
    id: 'desired_field',
    question: 'What field are you actually targeting?',
    options: ['Tech & Startups', 'Creative Arts & Media', 'Finance & Business', 'I just want to go viral'],
  },
];

// Real titles from mapCareer, verbatim. The landing page shows what the
// product actually outputs instead of invented examples.
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

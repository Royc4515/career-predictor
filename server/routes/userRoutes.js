const express = require('express');
const { saveOnboarding, getOnboardingByUserId } = require('../db');
const router = express.Router();

// --- Auth guard middleware ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// --- Career mapping logic ---
function mapCareer(strength, mondayVibe, coworkerDesc, fiveYearGoal, desiredField) {
  const s = strength || '';
  const m = mondayVibe || '';
  const c = coworkerDesc || '';
  const g = fiveYearGoal || '';
  const f = desiredField || '';

  // Helper checks
  const isLeader     = s.includes('Strategic');
  const isCreative   = s.includes('creativity');
  const isGrinder    = s.includes("don't quit");
  const isNetworker  = s.includes('people who know');

  const drinksCoffee = m.includes('coffee');
  const suffers      = m.includes('suffering');
  const sameEveryDay = m.includes('same');
  const lovesMon     = m.includes('love Mondays');

  const isReliable   = c.includes('reliable');
  const isVisionary  = c.includes('visionary');
  const isLoner      = c.includes('have coworkers');
  const isSnackGuy   = c.includes('orders food');

  const wantsCEO     = g.includes('CEO');
  const wantsBeach   = g.includes('beach');
  const wantsSurvive = g.includes('employed');
  const noPlan       = g.includes('social construct');

  const isTech     = f.includes('Tech');
  const isCreativeField = f.includes('Creative');
  const isFinance  = f.includes('Finance');
  const wantsViral = f.includes('viral');

  // === TIER 1: Field + Goal combos (most specific) ===

  if (isTech && wantsCEO) return {
    title: 'Founder Waiting for Series A That Will Never Come',
    prompt: 'person in hoodie staring at pitch deck laptop in WeWork with empty coffee cups and whiteboard, dim startup lighting',
    caption: 'Your destiny involves pitch decks, empty promises, and a WeWork membership that expires next month.',
    happiness: 18, salary: '$0 (pre-revenue)', outlook: 'Pivoting to B2B SaaS',
  };

  if (isTech && wantsBeach) return {
    title: 'Remote DevOps Engineer Who Blames the Wi-Fi',
    prompt: 'person on tropical beach with laptop showing terminal errors, frustrated expression, palm trees and cocktail nearby',
    caption: 'Your deploy pipeline breaks every time a cloud passes over your beach umbrella.',
    happiness: 71, salary: 'Contractor rates minus paradise tax', outlook: 'Connection unstable',
  };

  if (isTech && wantsSurvive) return {
    title: 'JIRA Ticket Archaeologist, Legacy Systems Division',
    prompt: 'person in dark server room surrounded by ancient computer towers covered in cobwebs, holding a floppy disk reverently',
    caption: 'You maintain code from 2007 that nobody understands, including the person who wrote it. Especially the person who wrote it.',
    happiness: 34, salary: 'Stable but soul-crushing', outlook: 'COBOL never dies',
  };

  if (isTech && noPlan) return {
    title: 'Open Source Contributor (0 Stars, 0 Forks)',
    prompt: 'person at desk with multiple monitors showing empty GitHub repos with zero stars, looking proud anyway, dark room with LED lights',
    caption: 'You built it. Nobody came. You keep building anyway because the code is the point.',
    happiness: 58, salary: 'GitHub sponsorship: $0/mo', outlook: 'Waiting for Hacker News',
  };

  if (isCreativeField && wantsCEO) return {
    title: 'Creative Director of Vibes and Nothing Else',
    prompt: 'person in turtleneck standing at whiteboard covered in abstract shapes and arrows that mean nothing, modern agency office',
    caption: 'Your strategy decks are beautiful. Nobody knows what they mean. That is the strategy.',
    happiness: 53, salary: 'Enough for Figma Pro', outlook: 'Award-winning but underfunded',
  };

  if (isCreativeField && wantsBeach) return {
    title: 'Travel Photographer Whose Parents Ask When They\'ll Get a Real Job',
    prompt: 'person on beach holding expensive camera photographing sunset while phone shows concerned parent text messages',
    caption: 'Every sunset is content. Every family dinner is a pitch meeting you did not ask for.',
    happiness: 76, salary: '$0.003 per download', outlook: 'Golden hour forever',
  };

  if (isCreativeField && wantsSurvive) return {
    title: 'UX Designer for an App That Will Be Deprecated',
    prompt: 'person presenting app mockup on big screen to a bored executive looking at phone, modern office, frustrated expression',
    caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
    happiness: 45, salary: 'Enough for Figma Pro', outlook: 'Figma will fix it',
  };

  if (isCreativeField) return { // noPlan
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'person surrounded by hundreds of unfinished sketchbooks and sticky notes, holding one lightbulb victoriously, colorful chaotic studio',
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
  };

  if (isFinance && wantsCEO) return {
    title: 'Crypto Hedge Fund Manager (Funds: $847)',
    prompt: 'confident person in suit at desk with 8 monitors all showing red graphs, holding a printout, serious expression',
    caption: 'Your portfolio is 98% down but your confidence remains at an all-time high.',
    happiness: 11, salary: '$847 AUM', outlook: 'Waiting for the dip to recover',
  };

  if (isFinance && wantsBeach) return {
    title: 'Offshore Tax Consultant (Legally Speaking)',
    prompt: 'person in linen suit on beach with briefcase full of spreadsheets blowing in wind, tropical island background, confident smile',
    caption: 'You optimize other people\'s money from a place where your own money is optimized.',
    happiness: 69, salary: 'Tax-efficient', outlook: 'Cayman Islands adjacent',
  };

  if (isFinance && wantsSurvive) return {
    title: 'Junior Analyst Who Ages 10 Years Per Quarter',
    prompt: 'young person at desk with dark circles under eyes surrounded by Excel spreadsheets and energy drinks, office at night',
    caption: 'Your pivot tables are immaculate. Your will to live is less so.',
    happiness: 15, salary: 'Golden handcuffs', outlook: 'Bonus season pending',
  };

  if (isFinance) return { // noPlan
    title: 'Day Trader Who Calls It "Research"',
    prompt: 'person in bathrobe staring at multiple monitors with candlestick charts in messy bedroom, eating cereal',
    caption: 'Your watchlist has 200 tickers. Your portfolio has 3. Your mother is concerned.',
    happiness: 44, salary: 'Unrealized gains', outlook: 'Diamond hands',
  };

  if (wantsViral) return {
    title: 'Content Creator, Currently at 23 Followers',
    prompt: 'person filming themselves with ring light in bedroom, phone showing 23 followers, professional setup modest audience, hopeful expression',
    caption: 'Fame is just one viral video away. You have been saying this for three years.',
    happiness: 62, salary: '$0.04 in ad revenue', outlook: 'The algorithm will come around',
  };

  // === TIER 2: Strength + Goal combos ===

  if (isLeader && wantsCEO) return {
    title: 'Chief Executive of a Declining Startup',
    prompt: 'person in oversized suit in empty office with motivational posters falling off walls, looking confident at camera',
    caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
    happiness: 12, salary: 'Equity in a company worth $0', outlook: 'Pivoting aggressively',
  };

  if (isLeader && wantsBeach) return {
    title: 'Retired Management Consultant (Age 29)',
    prompt: 'young person on beach in business casual shorts holding a whiteboard marker and cocktail, hammock with laptop in background',
    caption: 'You disrupted your own career by strategically doing nothing. Bold move.',
    happiness: 82, salary: 'Savings running out', outlook: 'Advising from the hammock',
  };

  if (isLeader && wantsSurvive) return {
    title: 'Middle Manager Who Peaked at the Strategy Offsite',
    prompt: 'person in polo shirt standing by whiteboard in generic conference room with half-eaten pizza, giving presentation to empty chairs',
    caption: 'Your SWOT analysis was legendary. That was 2019. You have been coasting since.',
    happiness: 38, salary: 'Band 4 (ceiling reached)', outlook: 'Restructuring imminent',
  };

  if (isLeader && noPlan) return {
    title: 'Strategy Consultant for Problems That Don\'t Exist',
    prompt: 'person in blazer gesturing at complex flowchart on glass wall that leads nowhere, modern empty office, thoughtful expression',
    caption: 'You solve problems that nobody has, and you charge by the hour for it.',
    happiness: 56, salary: 'Retainer-based fiction', outlook: 'Synergy pending',
  };

  if (isNetworker && wantsCEO) return {
    title: 'LinkedIn Influencer Emeritus',
    prompt: 'person in business casual giving passionate speech to empty conference room, name badge visible, enthusiastic gestures',
    caption: 'Your network is your net worth, and both are currently in the red.',
    happiness: 41, salary: 'Paid in exposure', outlook: 'Open to opportunities',
  };

  if (isNetworker && wantsBeach) return {
    title: 'Digital Nomad Coach (Currently Offline)',
    prompt: 'person on beach holding laptop showing no signal screen, very confident, self-help books half-buried in sand',
    caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
    happiness: 55, salary: 'Location-independent poverty', outlook: 'Vibes-based strategy',
  };

  if (isNetworker && wantsSurvive) return {
    title: 'Corporate Event Planner Nobody Invited',
    prompt: 'person setting up name tags at empty conference table with too many chairs, balloon arch deflating in background, office setting',
    caption: 'You organized the team-building retreat. Three people came. One was from IT support.',
    happiness: 33, salary: 'Per-event basis', outlook: 'RSVP pending',
  };

  if (isNetworker && noPlan) return {
    title: 'Professional Networker (Job Title Unclear)',
    prompt: 'person at coffee shop with 47 business cards spread on table, phone with LinkedIn open, writing in a notebook labeled connections',
    caption: 'You know everyone and no one knows what you actually do. Including you.',
    happiness: 49, salary: 'Coffee meetings (expensed)', outlook: 'Let me introduce you to someone',
  };

  if (isCreative && wantsCEO) return {
    title: 'Chief Vibes Officer at a Company of One',
    prompt: 'person in colorful outfit in tiny home office with motivational art they made themselves, typing on laptop with one hand, painting with other',
    caption: 'You are the CEO, CTO, and janitor. The company is you. Revenue is optional.',
    happiness: 63, salary: 'Passion-based economy', outlook: 'Manifesting growth',
  };

  if (isCreative && wantsBeach) return {
    title: 'Professional Sunset Photographer for Stock Sites Nobody Uses',
    prompt: 'person on tropical beach with 47 cameras and tripods, confused at laptop showing zero downloads, golden hour lighting',
    caption: 'Golden hour is your office, and zero downloads is your quarterly report.',
    happiness: 67, salary: '$0.003 per download', outlook: 'Chasing the light',
  };

  if (isCreative && wantsSurvive) return {
    title: 'Graphic Designer Who Dies Inside at Every "Make the Logo Bigger"',
    prompt: 'person at desk with head in hands, monitor showing beautiful design with red markup notes saying MAKE LOGO BIGGER, office setting',
    caption: 'Your portfolio is exquisite. Your clients are not. The logo will always need to be bigger.',
    happiness: 29, salary: 'Per revision (infinite revisions)', outlook: 'One more round of feedback',
  };

  if (isCreative && noPlan) return {
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'person surrounded by unfinished sketchbooks and sticky note ideas, holding lightbulb victoriously, chaotic colorful studio',
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
  };

  if (isGrinder && wantsCEO) return {
    title: 'VP of Hustle Culture, Self-Appointed',
    prompt: 'person in blazer giving thumbs up, surrounded by productivity books and energy drink cans, motivational whiteboard',
    caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
    happiness: 23, salary: '5am wake-up call (unpaid)', outlook: 'Grinding never stops',
  };

  if (isGrinder && wantsBeach) return {
    title: 'Burnout Survivor Currently "Finding Themselves"',
    prompt: 'exhausted person on beach in wrinkled business shirt, laptop closed, staring at ocean with thousand-yard stare, shoes next to briefcase in sand',
    caption: 'You worked 80-hour weeks to earn a vacation you are too tired to enjoy.',
    happiness: 51, salary: 'Sabbatical (unpaid)', outlook: 'Recovering',
  };

  if (isGrinder && wantsSurvive) return {
    title: 'Eternal Intern, Distinguished Fellow',
    prompt: 'person in oversized intern badge standing straight, holding giant stack of papers, trying to look indispensable, modern office',
    caption: 'Three years in and they still have not learned your name. But you persist.',
    happiness: 27, salary: 'School credit (maybe)', outlook: 'Permanent position pending',
  };

  if (isGrinder && noPlan) return {
    title: 'Productivity YouTuber With Zero Productivity',
    prompt: 'person at impossibly organized desk with color-coded planners and timers, filming setup visible, screen showing video with 12 views',
    caption: 'You spent 6 hours organizing your to-do list. The to-do list has one item: make to-do list.',
    happiness: 40, salary: 'Ad revenue: $1.23', outlook: 'Optimizing the optimization',
  };

  // === TIER 3: Monday + Coworker combos (catch remaining) ===

  if (drinksCoffee && isReliable) return {
    title: 'Chief Coffee Officer and Meeting Survivor',
    prompt: 'person in business casual holding 4 coffee cups with thousand-yard stare, calendar wall fully blocked in red',
    caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
    happiness: 31, salary: 'Benefits include free coffee', outlook: 'One more meeting',
  };

  if (drinksCoffee && isVisionary) return {
    title: 'Caffeinated Prophet of the Next Big Thing',
    prompt: 'wide-eyed person at whiteboard drawing interconnected circles frantically, coffee cups stacked like pyramid, late night office',
    caption: 'After cup number seven, you see the future. Unfortunately, nobody else does.',
    happiness: 47, salary: 'Vision-based compensation', outlook: 'Buzzing',
  };

  if (drinksCoffee && isLoner) return {
    title: 'Solo Developer Running on Espresso and Spite',
    prompt: 'person alone in dark room with multiple monitors and espresso machine on desk, code on screens, headphones on, determined face',
    caption: 'You do not need coworkers. You need a better coffee maker and faster internet.',
    happiness: 72, salary: 'Freelance feast-or-famine', outlook: 'Caffeinated independence',
  };

  if (drinksCoffee && isSnackGuy) return {
    title: 'Office Supply Chain Manager (Unofficial)',
    prompt: 'person at desk surrounded by snack wrappers and coffee cups, phone showing food delivery apps, coworkers in background looking hungry',
    caption: 'You keep the team fed and caffeinated. Without you, productivity drops to zero.',
    happiness: 65, salary: 'Expensed meals', outlook: 'Catering budget approved',
  };

  if (suffers && isReliable) return {
    title: 'Senior Associate of Quiet Desperation',
    prompt: 'person at desk with forced smile wearing business attire, surrounded by sticky notes and wilting plant',
    caption: 'You are the backbone of a company that does not know your last name.',
    happiness: 19, salary: 'Competitive (for 2008)', outlook: 'Stable',
  };

  if (suffers && isVisionary) return {
    title: 'Misunderstood Genius in the Wrong Department',
    prompt: 'person staring out office window dramatically, notebook full of brilliant ideas on desk that nobody reads, gray cubicle',
    caption: 'Your ideas could change the company. Unfortunately, they are in a notebook nobody opens.',
    happiness: 22, salary: 'Undervalued', outlook: 'Transfer request pending',
  };

  if (suffers && isLoner) return {
    title: 'Remote Worker Who Forgot What Humans Look Like',
    prompt: 'person in pajamas at home desk with blinds closed, video call on screen showing confused faces, plant dying in corner',
    caption: 'You turned off your camera in 2020 and nobody has seen your face since.',
    happiness: 48, salary: 'Saved on pants budget', outlook: 'Camera permanently off',
  };

  if (suffers && isSnackGuy) return {
    title: 'Comfort Food Therapist (Self-Employed)',
    prompt: 'person at desk with impressive collection of snacks organized by mood, spreadsheet open tracking emotional eating patterns',
    caption: 'Your coping mechanism is delicious and your snack drawer has better organization than your life.',
    happiness: 55, salary: 'Snack budget: unlimited', outlook: 'Emotionally stable (when fed)',
  };

  if (sameEveryDay && isReliable) return {
    title: 'Senior Bureaucrat, Department of Doing Things Correctly',
    prompt: 'person at perfectly organized desk with everything at right angles, stamp in hand, stack of forms, fluorescent office lighting',
    caption: 'You have processed 10,000 forms without a single error. Nobody has thanked you once.',
    happiness: 35, salary: 'Government grade (with pension)', outlook: 'Predictably stable',
  };

  if (sameEveryDay && isVisionary) return {
    title: 'Philosopher Who Accidentally Ended Up in Corporate',
    prompt: 'person in business attire reading philosophy book at desk while spreadsheet is open, existential expression, office cubicle',
    caption: 'You ponder the meaning of work while doing meaningless work. The irony sustains you.',
    happiness: 43, salary: 'Existentially adequate', outlook: 'Contemplating',
  };

  if (sameEveryDay && isLoner) return {
    title: 'Night Shift Security Guard / Aspiring Novelist',
    prompt: 'person at security desk in empty building at night, notebook open next to monitors, peaceful solitude, dim lighting',
    caption: 'You guard an empty building and write a novel nobody will read. Both bring you peace.',
    happiness: 61, salary: 'Night differential', outlook: 'Chapter 47 in progress',
  };

  if (sameEveryDay && isSnackGuy) return {
    title: 'Professional Taste Tester (Self-Appointed)',
    prompt: 'person with clipboard in break room rating snacks from vending machine, very serious expression, colleagues confused',
    caption: 'You have reviewed every item in the vending machine. B7 is your magnum opus.',
    happiness: 68, salary: 'Vending machine budget', outlook: 'Flavor matrix expanding',
  };

  if (lovesMon) return {
    title: 'Corporate Optimism Evangelist',
    prompt: 'suspiciously cheerful person in bright office with Monday Motivation sign, uncomfortable colleagues in background',
    caption: 'Your relentless positivity is both your superpower and why people avoid the break room.',
    happiness: 52, salary: 'Rewarded with enthusiasm', outlook: 'Concerningly positive',
  };

  if (isSnackGuy) return {
    title: 'Senior Falafel Architect, Tel Aviv District',
    prompt: 'person in chef hat holding blueprints made of pita bread and falafel, modern kitchen, serious expression',
    caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
    happiness: 88, salary: 'All the falafel you can eat', outlook: 'Structurally sound',
  };

  if (isLoner) return {
    title: 'Remote Work Pioneer and Professional Hermit',
    prompt: 'person in pajamas at desk with 6 monitors, cat on keyboard, blackout curtains, triumphant expression, cinematic lighting',
    caption: 'Your commute is 12 steps and your coworker is a cat who judges you silently.',
    happiness: 94, salary: 'Enough for fiber internet', outlook: 'Do not disturb',
  };

  if (isVisionary) return {
    title: 'Thought Leader Without the Thought',
    prompt: 'person on stage at empty TED-style event, large screen behind showing buzzword cloud, one person in audience asleep',
    caption: 'You have vision. You have passion. You have no actionable plan whatsoever.',
    happiness: 46, salary: 'Speaking fees (waived)', outlook: 'Disruption imminent',
  };

  // Ultimate fallback (should be nearly unreachable now)
  return {
    title: 'Professional Human Being (Specialization Pending)',
    prompt: 'person standing at crossroads in business casual, holding map upside down, multiple road signs pointing different directions',
    caption: 'You defy every algorithm, every matrix, and every career quiz. HR has given up classifying you.',
    happiness: 50, salary: 'Negotiable (probably not)', outlook: 'Beautifully undefined',
  };
}

// POST /api/user/onboarding — save answers, generate image, return result
router.post('/onboarding', requireAuth, async (req, res) => {
  const { strength, monday_vibe, coworker_desc, five_year_goal, desired_field } = req.body;
  const userId = req.user.id;

  console.log('[ROUTE] POST /api/user/onboarding — user:', req.user.name);
  console.log('[ROUTE] Answers:', { strength, monday_vibe, coworker_desc, five_year_goal, desired_field });

  if (!strength || !monday_vibe || !coworker_desc || !five_year_goal) {
    return res.status(400).json({ error: 'All four answers are required' });
  }

  // Map answers → career
  const career = mapCareer(strength, monday_vibe, coworker_desc, five_year_goal, desired_field);
  console.log('[ROUTE] Career mapped:', career.title);

  // Build Pollinations.ai image URL
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(career.prompt)}?width=512&height=512&nologo=true&seed=${userId}`;
  console.log('[ROUTE] Image URL generated, pre-warming...');

  // Fire-and-forget: kick off image generation immediately so it's ready by the time the user arrives
  fetch(imageUrl).catch(() => {});

  // Save to DB
  saveOnboarding({
    userId,
    strength,
    mondayVibe: monday_vibe,
    coworkerDesc: coworker_desc,
    fiveYearGoal: five_year_goal,
    desiredField: desired_field,
    careerResult: JSON.stringify({ title: career.title, caption: career.caption, happiness: career.happiness, salary: career.salary, outlook: career.outlook }),
    imageUrl,
  });

  res.json({
    careerTitle: career.title,
    caption: career.caption,
    imageUrl,
    stats: {
      happiness: career.happiness,
      salary: career.salary,
      outlook: career.outlook,
    },
  });
});

// GET /api/user/result — fetch saved result for current user
router.get('/result', requireAuth, (req, res) => {
  console.log('[ROUTE] GET /api/user/result — user:', req.user.name);

  const row = getOnboardingByUserId(req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'No result found' });
  }

  const parsed = JSON.parse(row.career_result);
  res.json({
    careerTitle: parsed.title,
    caption: parsed.caption || 'Your career destiny has been sealed by the algorithm.',
    imageUrl: row.image_url,
    stats: {
      happiness: parsed.happiness,
      salary: parsed.salary,
      outlook: parsed.outlook,
    },
  });
});

module.exports = router;

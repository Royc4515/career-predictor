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
  // Normalize inputs to lowercase keys
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

  // --- Field-aware careers (checked first) ---
  if (isTech && wantsCEO) return {
    title: 'Founder Waiting for Series A That Will Never Come',
    prompt: 'portrait of a person in a hoodie staring at a pitch deck on a laptop in a WeWork, surrounded by empty coffee cups and a whiteboard that says "10x disruption", dim startup lighting, tech photography style',
    caption: 'Your destiny involves pitch decks, empty promises, and a WeWork membership that expires next month.',
    happiness: 18,
    salary: '$0 (pre-revenue)',
    outlook: 'Pivoting to B2B SaaS',
  };

  if (isCreativeField) return {
    title: 'UX Designer for an App That Will Be Deprecated',
    prompt: 'portrait of a person presenting a beautiful app mockup on a giant screen to a bored executive who is clearly looking at his phone, modern office, frustrated designer expression, tech photography style',
    caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
    happiness: 45,
    salary: 'Enough for Figma Pro',
    outlook: 'Figma will fix it',
  };

  if (isFinance && wantsCEO) return {
    title: 'Crypto Hedge Fund Manager (Funds: $847)',
    prompt: 'portrait of a confident person in a suit sitting at a desk with 8 monitors all showing red graphs, holding a printout that says portfolio value: $847, trying to look serious, dramatic financial photography',
    caption: 'Your portfolio is 98% down but your confidence remains at an all-time high.',
    happiness: 11,
    salary: '$847 AUM',
    outlook: 'Waiting for the dip to recover',
  };

  if (wantsViral) return {
    title: 'Content Creator, Currently at 23 Followers',
    prompt: 'portrait of a person filming themselves on a ring light in a bedroom, phone showing 23 followers, very professional setup for very modest audience, influencer photography style, hopeful expression',
    caption: 'Fame is just one viral video away. You have been saying this for three years.',
    happiness: 62,
    salary: '$0.04 in ad revenue',
    outlook: 'The algorithm will come around',
  };

  // --- Mapping table: priority order ---
  if (isLeader && wantsCEO) return {
    title: 'Chief Executive of a Declining Startup',
    prompt: 'professional portrait of a person in an oversized suit sitting in an empty office, motivational posters falling off the walls behind them, looking confidently at the camera, corporate photography style',
    caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
    happiness: 12,
    salary: 'Equity in a company worth $0',
    outlook: 'Pivoting aggressively',
  };

  if (isNetworker && wantsCEO) return {
    title: 'LinkedIn Influencer Emeritus',
    prompt: 'professional portrait of a person in business casual attire giving a passionate speech to an empty conference room, name badge visible, gesturing with enthusiasm, corporate photography style',
    caption: 'Your network is your net worth, and both are currently in the red.',
    happiness: 41,
    salary: 'Paid in exposure',
    outlook: 'Open to opportunities',
  };

  if (isCreative && wantsBeach) return {
    title: 'Professional Sunset Photographer for Stock Sites Nobody Uses',
    prompt: 'portrait of a person on a tropical beach surrounded by 47 cameras and tripods, looking confused at a laptop showing zero downloads, golden hour lighting, travel photography style',
    caption: 'Golden hour is your office, and zero downloads is your quarterly report.',
    happiness: 67,
    salary: '$0.003 per download',
    outlook: 'Chasing the light',
  };

  if (isSnackGuy && wantsSurvive) return {
    title: 'Senior Falafel Architect, Tel Aviv District',
    prompt: 'portrait of a person in a chef hat holding architectural blueprints made entirely of pita bread and falafel, standing in a modern kitchen with a serious expression, food photography style',
    caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
    happiness: 88,
    salary: 'All the falafel you can eat',
    outlook: 'Structurally sound',
  };

  if (isVisionary && wantsSurvive) return {
    title: 'Blockchain Consultant (2019–2022, RIP)',
    prompt: 'portrait of a sad person wearing a crypto t-shirt holding a handful of worthless coins, surrounded by motivational posters about disruption and NFTs, dim lighting, documentary photography style',
    caption: 'You were early. That is what you keep telling yourself. You were just early.',
    happiness: 8,
    salary: 'Unrealized gains',
    outlook: 'Waiting for the next bull run',
  };

  if (isLoner && noPlan) return {
    title: 'Remote Work Pioneer and Professional Hermit',
    prompt: 'portrait of a person in pajamas at a desk surrounded by 6 monitors, cat on keyboard, blackout curtains in background, triumphant expression, cinematic lighting, tech photography style',
    caption: 'Your commute is 12 steps and your coworker is a cat who judges you silently.',
    happiness: 94,
    salary: 'Enough for fiber internet',
    outlook: 'Do not disturb',
  };

  if (isGrinder && wantsCEO) return {
    title: 'VP of Hustle Culture, Self-Appointed',
    prompt: 'portrait of a person in a blazer giving a thumbs up, surrounded by productivity books and empty energy drink cans, motivational quotes on a whiteboard behind them, bright corporate photography',
    caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
    happiness: 23,
    salary: '5am wake-up call (unpaid)',
    outlook: 'Grinding never stops',
  };

  if (drinksCoffee && isReliable) return {
    title: 'Chief Coffee Officer and Meeting Survivor',
    prompt: 'portrait of a person in business casual holding 4 coffee cups simultaneously with a thousand-yard stare, calendar on the wall fully blocked out in red, fluorescent office lighting',
    caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
    happiness: 31,
    salary: 'Benefits include free coffee',
    outlook: 'One more meeting',
  };

  if (suffers && isReliable) return {
    title: 'Senior Associate of Quiet Desperation',
    prompt: 'portrait of a person at a desk with a forced smile, wearing business attire, surrounded by sticky notes, a wilting plant, and a motivational poster that says hang in there, soft office lighting',
    caption: 'You are the backbone of a company that does not know your last name.',
    happiness: 19,
    salary: 'Competitive (for 2008)',
    outlook: 'Stable',
  };

  if (lovesMon && wantsCEO) return {
    title: 'Corporate Optimism Evangelist',
    prompt: 'portrait of a suspiciously cheerful person in a bright office holding a "Monday Motivation" sign, colleagues looking uncomfortable in the background, overly bright corporate photography',
    caption: 'Your relentless positivity is both your superpower and why people avoid the break room.',
    happiness: 52,
    salary: 'Rewarded with enthusiasm',
    outlook: 'Concerningly positive',
  };

  if (sameEveryDay && noPlan) return {
    title: 'Tenured Professor of Doing Whatever This Is',
    prompt: 'portrait of a person in a slightly rumpled blazer standing in front of an illegible whiteboard, holding chalk, looking mildly bewildered, academic photography style',
    caption: 'Nobody understands your research, including you, and that is perfectly fine.',
    happiness: 61,
    salary: 'Published, not perished',
    outlook: 'Sabbatical pending',
  };

  if (isCreative && noPlan) return {
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'portrait of a person surrounded by hundreds of unfinished sketchbooks and sticky note ideas, holding one lightbulb victoriously, chaotic colorful studio background, artistic photography',
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74,
    salary: 'Revenue model TBD',
    outlook: 'Lots of irons in the fire',
  };

  if (isNetworker && wantsBeach) return {
    title: 'Digital Nomad Coach (Currently Offline)',
    prompt: 'portrait of a person on a beach holding a laptop showing a "no signal" screen, looking very confident about it, surrounded by self-help books half-buried in sand, travel photography style',
    caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
    happiness: 55,
    salary: 'Location-independent poverty',
    outlook: 'Vibes-based strategy',
  };

  if (isGrinder && wantsSurvive) return {
    title: 'Eternal Intern, Distinguished Fellow',
    prompt: 'portrait of a person in an oversized intern badge standing very straight, holding a giant stack of papers, trying to look indispensable in a modern open-plan office, corporate photography',
    caption: 'Three years in and they still have not learned your name. But you persist.',
    happiness: 27,
    salary: 'School credit (maybe)',
    outlook: 'Permanent position pending',
  };

  // Fallback
  return {
    title: 'Unclassified Professional (Category: Human)',
    prompt: 'portrait of a person in business casual looking thoughtfully into the distance, holding a briefcase that is clearly empty, standing in a generic office lobby, professional photography style',
    caption: 'You defy categorization. HR is both impressed and deeply confused.',
    happiness: 42,
    salary: 'Negotiable (probably not)',
    outlook: 'Unclear but promising',
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

  // Build Pollinations.ai image URL — flux-schnell generates in 1-5s vs 15-30s
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(career.prompt)}?width=512&height=512&nologo=true&seed=${userId}&model=flux-schnell`;
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

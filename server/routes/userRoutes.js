const express = require('express');
const { saveOnboarding, getOnboardingByUserId } = require('../db');
const router = express.Router();

// --- Auth guard middleware ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// --- Career mapping logic ---
function mapCareer(strength, mondayVibe, coworkerDesc, fiveYearGoal) {
  // Normalize inputs to lowercase keys
  const s = strength || '';
  const m = mondayVibe || '';
  const c = coworkerDesc || '';
  const g = fiveYearGoal || '';

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

  // --- Mapping table: priority order ---
  if (isLeader && wantsCEO) return {
    title: 'Chief Executive of a Declining Startup',
    prompt: 'professional portrait of a person in an oversized suit sitting in an empty office, motivational posters falling off the walls behind them, looking confidently at the camera, corporate photography style',
    happiness: 12,
    salary: 'Equity in a company worth $0',
    outlook: 'Pivoting aggressively',
  };

  if (isNetworker && wantsCEO) return {
    title: 'LinkedIn Influencer Emeritus',
    prompt: 'professional portrait of a person in business casual attire giving a passionate speech to an empty conference room, name badge visible, gesturing with enthusiasm, corporate photography style',
    happiness: 41,
    salary: 'Paid in exposure',
    outlook: 'Open to opportunities',
  };

  if (isCreative && wantsBeach) return {
    title: 'Professional Sunset Photographer for Stock Sites Nobody Uses',
    prompt: 'portrait of a person on a tropical beach surrounded by 47 cameras and tripods, looking confused at a laptop showing zero downloads, golden hour lighting, travel photography style',
    happiness: 67,
    salary: '$0.003 per download',
    outlook: 'Chasing the light',
  };

  if (isSnackGuy && wantsSurvive) return {
    title: 'Senior Falafel Architect, Tel Aviv District',
    prompt: 'portrait of a person in a chef hat holding architectural blueprints made entirely of pita bread and falafel, standing in a modern kitchen with a serious expression, food photography style',
    happiness: 88,
    salary: 'All the falafel you can eat',
    outlook: 'Structurally sound',
  };

  if (isVisionary && wantsSurvive) return {
    title: 'Blockchain Consultant (2019–2022, RIP)',
    prompt: 'portrait of a sad person wearing a crypto t-shirt holding a handful of worthless coins, surrounded by motivational posters about disruption and NFTs, dim lighting, documentary photography style',
    happiness: 8,
    salary: 'Unrealized gains',
    outlook: 'Waiting for the next bull run',
  };

  if (isLoner && noPlan) return {
    title: 'Remote Work Pioneer and Professional Hermit',
    prompt: 'portrait of a person in pajamas at a desk surrounded by 6 monitors, cat on keyboard, blackout curtains in background, triumphant expression, cinematic lighting, tech photography style',
    happiness: 94,
    salary: 'Enough for fiber internet',
    outlook: 'Do not disturb',
  };

  if (isGrinder && wantsCEO) return {
    title: 'VP of Hustle Culture, Self-Appointed',
    prompt: 'portrait of a person in a blazer giving a thumbs up, surrounded by productivity books and empty energy drink cans, motivational quotes on a whiteboard behind them, bright corporate photography',
    happiness: 23,
    salary: '5am wake-up call (unpaid)',
    outlook: 'Grinding never stops',
  };

  if (drinksCoffee && isReliable) return {
    title: 'Chief Coffee Officer and Meeting Survivor',
    prompt: 'portrait of a person in business casual holding 4 coffee cups simultaneously with a thousand-yard stare, calendar on the wall fully blocked out in red, fluorescent office lighting',
    happiness: 31,
    salary: 'Benefits include free coffee',
    outlook: 'One more meeting',
  };

  if (suffers && isReliable) return {
    title: 'Senior Associate of Quiet Desperation',
    prompt: 'portrait of a person at a desk with a forced smile, wearing business attire, surrounded by sticky notes, a wilting plant, and a motivational poster that says hang in there, soft office lighting',
    happiness: 19,
    salary: 'Competitive (for 2008)',
    outlook: 'Stable',
  };

  if (lovesMon && wantsCEO) return {
    title: 'Corporate Optimism Evangelist',
    prompt: 'portrait of a suspiciously cheerful person in a bright office holding a "Monday Motivation" sign, colleagues looking uncomfortable in the background, overly bright corporate photography',
    happiness: 52,
    salary: 'Rewarded with enthusiasm',
    outlook: 'Concerningly positive',
  };

  if (sameEveryDay && noPlan) return {
    title: 'Tenured Professor of Doing Whatever This Is',
    prompt: 'portrait of a person in a slightly rumpled blazer standing in front of an illegible whiteboard, holding chalk, looking mildly bewildered, academic photography style',
    happiness: 61,
    salary: 'Published, not perished',
    outlook: 'Sabbatical pending',
  };

  if (isCreative && noPlan) return {
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'portrait of a person surrounded by hundreds of unfinished sketchbooks and sticky note ideas, holding one lightbulb victoriously, chaotic colorful studio background, artistic photography',
    happiness: 74,
    salary: 'Revenue model TBD',
    outlook: 'Lots of irons in the fire',
  };

  if (isNetworker && wantsBeach) return {
    title: 'Digital Nomad Coach (Currently Offline)',
    prompt: 'portrait of a person on a beach holding a laptop showing a "no signal" screen, looking very confident about it, surrounded by self-help books half-buried in sand, travel photography style',
    happiness: 55,
    salary: 'Location-independent poverty',
    outlook: 'Vibes-based strategy',
  };

  if (isGrinder && wantsSurvive) return {
    title: 'Eternal Intern, Distinguished Fellow',
    prompt: 'portrait of a person in an oversized intern badge standing very straight, holding a giant stack of papers, trying to look indispensable in a modern open-plan office, corporate photography',
    happiness: 27,
    salary: 'School credit (maybe)',
    outlook: 'Permanent position pending',
  };

  // Fallback
  return {
    title: 'Unclassified Professional (Category: Human)',
    prompt: 'portrait of a person in business casual looking thoughtfully into the distance, holding a briefcase that is clearly empty, standing in a generic office lobby, professional photography style',
    happiness: 42,
    salary: 'Negotiable (probably not)',
    outlook: 'Unclear but promising',
  };
}

// POST /api/user/onboarding — save answers, generate image, return result
router.post('/onboarding', requireAuth, async (req, res) => {
  const { strength, monday_vibe, coworker_desc, five_year_goal } = req.body;
  const userId = req.user.id;

  console.log('[ROUTE] POST /api/user/onboarding — user:', req.user.name);
  console.log('[ROUTE] Answers:', { strength, monday_vibe, coworker_desc, five_year_goal });

  if (!strength || !monday_vibe || !coworker_desc || !five_year_goal) {
    return res.status(400).json({ error: 'All four answers are required' });
  }

  // Map answers → career
  const career = mapCareer(strength, monday_vibe, coworker_desc, five_year_goal);
  console.log('[ROUTE] Career mapped:', career.title);

  // Build Pollinations.ai image URL (no API key needed)
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(career.prompt)}?width=512&height=512&nologo=true&seed=${userId}`;
  console.log('[ROUTE] Image URL generated');

  // Save to DB
  saveOnboarding({
    userId,
    strength,
    mondayVibe: monday_vibe,
    coworkerDesc: coworker_desc,
    fiveYearGoal: five_year_goal,
    careerResult: JSON.stringify({ title: career.title, happiness: career.happiness, salary: career.salary, outlook: career.outlook }),
    imageUrl,
  });

  res.json({
    careerTitle: career.title,
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
    imageUrl: row.image_url,
    stats: {
      happiness: parsed.happiness,
      salary: parsed.salary,
      outlook: parsed.outlook,
    },
  });
});

module.exports = router;

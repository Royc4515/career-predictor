const express = require('express');
const { saveOnboarding, getOnboardingByUserId } = require('../db');
const router = express.Router();

// --- Auth guard ---
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ---------------------------------------------------------------------------
// IMAGE GENERATION — Pollinations.ai (flux-realism model)
// ---------------------------------------------------------------------------

// Deterministic integer seed from career title.
// Same title always produces the same image — consistent across page reloads.
function titleToSeed(title) {
  return Math.abs(
    title.split('').reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) | 0, 0)
  ) % 2_147_483_647;
}

// Wraps a raw scene description with professional cinematography directives.
// Scene stays career-specific; suffix handles lighting, lens, and fidelity uniformly.
function enrichPrompt(scene) {
  return (
    scene + ', ' +
    'cinematic composition, dramatic chiaroscuro lighting, shallow depth of field, ' +
    'Canon EOS R5 85mm f/1.4 lens, photorealistic, 8K UHD, hyperdetailed textures, ' +
    'subsurface skin scattering, volumetric light rays, film grain, professionally color graded, ' +
    'editorial photography, award-winning shot'
  );
}

// Negative prompt — suppresses common AI artifacts across all generated images.
const NEGATIVE_PROMPT = [
  'ugly', 'deformed', 'noisy', 'blurry', 'low quality', 'worst quality',
  'bad anatomy', 'bad hands', 'extra limbs', 'missing limbs', 'fused fingers',
  'watermark', 'text overlay', 'signature', 'logo',
  'cartoon', 'anime', 'illustration', 'painting', 'sketch', '3D render',
  'plastic skin', 'overexposed', 'underexposed', 'washed out', 'flat lighting',
  'disfigured', 'mutated', 'duplicate', 'jpeg artifacts', 'cross-eyed',
].join(', ');

function buildImageUrl(prompt, title) {
  const seed = titleToSeed(title);
  return (
    'https://image.pollinations.ai/prompt/' +
    encodeURIComponent(enrichPrompt(prompt)) +
    '?model=flux-realism' +
    '&width=768&height=768' +
    '&nologo=true' +
    `&seed=${seed}` +
    `&negative_prompt=${encodeURIComponent(NEGATIVE_PROMPT)}`
  );
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
    prompt: 'exhausted young entrepreneur in hoodie hunched over a glowing laptop in a WeWork booth at 3am, surrounded by crumpled pitch decks and empty coffee cups, neon sign reflecting in dark windows',
    caption: 'Your destiny involves pitch decks, empty promises, and a WeWork membership that expires next month.',
    happiness: 18, salary: '$0 (pre-revenue)', outlook: 'Pivoting to B2B SaaS',
  };

  if (isTech && wantsBeach) return {
    title: 'Remote DevOps Engineer Who Blames the Wi-Fi',
    prompt: 'frustrated software developer sitting cross-legged on a tropical beach, MacBook showing a wall of red terminal errors, cocktail tipping beside them, palm trees swaying in golden hour light',
    caption: 'Your deploy pipeline breaks every time a cloud passes over your beach umbrella.',
    happiness: 71, salary: 'Contractor rates minus paradise tax', outlook: 'Connection unstable',
  };

  if (isTech && wantsSurvive) return {
    title: 'JIRA Ticket Archaeologist, Legacy Systems Division',
    prompt: 'lone developer in a vast dark server room, ancient mainframes draped in cobwebs towering around them, holding a floppy disk up to a beam of green terminal light with reverence',
    caption: 'You maintain code from 2007 that nobody understands, including the person who wrote it. Especially the person who wrote it.',
    happiness: 34, salary: 'Stable but soul-crushing', outlook: 'COBOL never dies',
  };

  if (isTech && noPlan) return {
    title: 'Open Source Contributor (0 Stars, 0 Forks)',
    prompt: 'determined programmer alone in a dark bedroom, multiple monitors displaying GitHub repositories frozen at zero stars and zero forks, RGB lighting casting shadows, proud defiant expression',
    caption: 'You built it. Nobody came. You keep building anyway because the code is the point.',
    happiness: 58, salary: 'GitHub sponsorship: $0/mo', outlook: 'Waiting for Hacker News',
  };

  if (isCreativeField && wantsCEO) return {
    title: 'Creative Director of Vibes and Nothing Else',
    prompt: 'stylish creative director in black turtleneck before a floor-to-ceiling whiteboard covered in incomprehensible abstract diagrams and colored sticky notes, sunlit minimal agency office, arms crossed with total confidence',
    caption: 'Your strategy decks are beautiful. Nobody knows what they mean. That is the strategy.',
    happiness: 53, salary: 'Enough for Figma Pro', outlook: 'Award-winning but underfunded',
  };

  if (isCreativeField && wantsBeach) return {
    title: 'Travel Photographer Whose Parents Ask When They\'ll Get a Real Job',
    prompt: 'travel photographer on a dramatic cliff at golden hour, expensive camera in one hand, phone in the other showing a chain of anxious parent texts, ocean stretching to the horizon, hair windswept',
    caption: 'Every sunset is content. Every family dinner is a pitch meeting you did not ask for.',
    happiness: 76, salary: '$0.003 per download', outlook: 'Golden hour forever',
  };

  if (isCreativeField && wantsSurvive) return {
    title: 'UX Designer for an App That Will Be Deprecated',
    prompt: 'UX designer presenting a pixel-perfect app mockup on a large conference screen to a bored executive scrolling their phone, glass-walled modern office, designer maintains optimistic expression despite everything',
    caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
    happiness: 45, salary: 'Enough for Figma Pro', outlook: 'Figma will fix it',
  };

  if (isCreativeField) return { // noPlan
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'eccentric creative surrounded by hundreds of unfinished sketchbooks, half-painted canvases, and sticky note ideas plastered everywhere, holding a single glowing lightbulb triumphantly in a gloriously chaotic studio',
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
  };

  if (isFinance && wantsCEO) return {
    title: 'Crypto Hedge Fund Manager (Funds: $847)',
    prompt: 'overconfident trader in sharp suit at a multi-monitor desk, all eight screens displaying plummeting red graphs, holding a single printed chart, expression of absolute unwarranted conviction',
    caption: 'Your portfolio is 98% down but your confidence remains at an all-time high.',
    happiness: 11, salary: '$847 AUM', outlook: 'Waiting for the dip to recover',
  };

  if (isFinance && wantsBeach) return {
    title: 'Offshore Tax Consultant (Legally Speaking)',
    prompt: 'composed consultant in linen suit on a white sand beach, leather briefcase open with spreadsheets caught in the sea breeze, tropical island in the background, completely at ease',
    caption: 'You optimize other people\'s money from a place where your own money is optimized.',
    happiness: 69, salary: 'Tax-efficient', outlook: 'Cayman Islands adjacent',
  };

  if (isFinance && wantsSurvive) return {
    title: 'Junior Analyst Who Ages 10 Years Per Quarter',
    prompt: 'young finance analyst at a cluttered desk at 2am, dark circles carved under their eyes, walls papered with Excel printouts, towers of energy drink cans, suit jacket over the chair, fluorescent light humming',
    caption: 'Your pivot tables are immaculate. Your will to live is less so.',
    happiness: 15, salary: 'Golden handcuffs', outlook: 'Bonus season pending',
  };

  if (isFinance) return { // noPlan
    title: 'Day Trader Who Calls It "Research"',
    prompt: 'disheveled day trader in bathrobe at home, staring with intense conviction at three monitors packed with candlestick charts, bowl of cereal going soggy, motivational trading poster on the wall behind them',
    caption: 'Your watchlist has 200 tickers. Your portfolio has 3. Your mother is concerned.',
    happiness: 44, salary: 'Unrealized gains', outlook: 'Diamond hands',
  };

  if (wantsViral) return {
    title: 'Content Creator, Currently at 23 Followers',
    prompt: 'aspiring content creator in a meticulously arranged bedroom studio, ring light blazing, phone on tripod, analytics screen in background showing a graph frozen near zero, hopeful determined expression',
    caption: 'Fame is just one viral video away. You have been saying this for three years.',
    happiness: 62, salary: '$0.04 in ad revenue', outlook: 'The algorithm will come around',
  };

  // === TIER 2: Strength + Goal combos ===

  if (isLeader && wantsCEO) return {
    title: 'Chief Executive of a Declining Startup',
    prompt: 'CEO in oversized suit standing alone in a half-empty modern office, motivational posters peeling from the walls, arms crossed with completely unfounded confidence, late afternoon sun through venetian blinds',
    caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
    happiness: 12, salary: 'Equity in a company worth $0', outlook: 'Pivoting aggressively',
  };

  if (isLeader && wantsBeach) return {
    title: 'Retired Management Consultant (Age 29)',
    prompt: 'young professional in business casual shorts lying in a beach hammock, laptop balanced on chest, whiteboard marker tucked behind one ear, cocktail in hand, eyes closed in genuine peace',
    caption: 'You disrupted your own career by strategically doing nothing. Bold move.',
    happiness: 82, salary: 'Savings running out', outlook: 'Advising from the hammock',
  };

  if (isLeader && wantsSurvive) return {
    title: 'Middle Manager Who Peaked at the Strategy Offsite',
    prompt: 'middle manager in polo shirt presenting to rows of empty conference chairs, whiteboard still showing a 2019 SWOT analysis, half-eaten cold pizza on the table, fluorescent lights, expression of hollow satisfaction',
    caption: 'Your SWOT analysis was legendary. That was 2019. You have been coasting since.',
    happiness: 38, salary: 'Band 4 (ceiling reached)', outlook: 'Restructuring imminent',
  };

  if (isLeader && noPlan) return {
    title: 'Strategy Consultant for Problems That Don\'t Exist',
    prompt: 'consultant in sharp blazer gesturing confidently at an elaborate flowchart on a glass wall, arrows looping back into question marks, empty sunlit modern office, utterly self-convinced',
    caption: 'You solve problems that nobody has, and you charge by the hour for it.',
    happiness: 56, salary: 'Retainer-based fiction', outlook: 'Synergy pending',
  };

  if (isNetworker && wantsCEO) return {
    title: 'LinkedIn Influencer Emeritus',
    prompt: 'energetic networker in business casual delivering a passionate keynote to a completely empty conference room, name badge prominently displayed, podium with branded water bottle, theatrical stage lighting',
    caption: 'Your network is your net worth, and both are currently in the red.',
    happiness: 41, salary: 'Paid in exposure', outlook: 'Open to opportunities',
  };

  if (isNetworker && wantsBeach) return {
    title: 'Digital Nomad Coach (Currently Offline)',
    prompt: 'self-assured digital nomad coach on a beach holding open laptop with a spinning no-signal loading wheel, stacks of self-help books half-buried in the sand, confident pose, blissfully unaware of the irony',
    caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
    happiness: 55, salary: 'Location-independent poverty', outlook: 'Vibes-based strategy',
  };

  if (isNetworker && wantsSurvive) return {
    title: 'Corporate Event Planner Nobody Invited',
    prompt: 'event coordinator arranging name tags at a conference table with thirty empty chairs, an elaborate balloon arch slowly deflating in the background, clipboard in hand, cheerful expression despite the emptiness',
    caption: 'You organized the team-building retreat. Three people came. One was from IT support.',
    happiness: 33, salary: 'Per-event basis', outlook: 'RSVP pending',
  };

  if (isNetworker && noPlan) return {
    title: 'Professional Networker (Job Title Unclear)',
    prompt: 'professional networker at a corner coffee shop table, 47 business cards fanned out, LinkedIn open on their phone, writing furiously in a leather notebook labeled CONNECTIONS in gold letters',
    caption: 'You know everyone and no one knows what you actually do. Including you.',
    happiness: 49, salary: 'Coffee meetings (expensed)', outlook: 'Let me introduce you to someone',
  };

  if (isCreative && wantsCEO) return {
    title: 'Chief Vibes Officer at a Company of One',
    prompt: 'multitasking creative in a bright patterned outfit in a tiny home office wallpapered with their own art, simultaneously typing with one hand and holding a paintbrush in the other, surrounded by plants and fairy lights',
    caption: 'You are the CEO, CTO, and janitor. The company is you. Revenue is optional.',
    happiness: 63, salary: 'Passion-based economy', outlook: 'Manifesting growth',
  };

  if (isCreative && wantsBeach) return {
    title: 'Professional Sunset Photographer for Stock Sites Nobody Uses',
    prompt: 'photographer on a tropical beach surrounded by an absurd number of camera tripods and equipment cases, laptop open to a stock photo site at zero downloads, framed by a breathtaking golden hour sky',
    caption: 'Golden hour is your office, and zero downloads is your quarterly report.',
    happiness: 67, salary: '$0.003 per download', outlook: 'Chasing the light',
  };

  if (isCreative && wantsSurvive) return {
    title: 'Graphic Designer Who Dies Inside at Every "Make the Logo Bigger"',
    prompt: 'graphic designer with head in hands at a standing desk, monitor displaying an exquisite minimalist logo covered in aggressive red markup annotations screaming BIGGER and MORE POP, cold coffee nearby',
    caption: 'Your portfolio is exquisite. Your clients are not. The logo will always need to be bigger.',
    happiness: 29, salary: 'Per revision (infinite revisions)', outlook: 'One more round of feedback',
  };

  if (isCreative && noPlan) return {
    title: 'Freelance Idea Generator (Execution Not Included)',
    prompt: 'charismatic creative in paint-splattered jacket surrounded by unfinished canvases, overflowing sketchbooks, and a wall of sticky note ideas, holding a glowing lightbulb with both hands triumphantly',
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
  };

  if (isGrinder && wantsCEO) return {
    title: 'VP of Hustle Culture, Self-Appointed',
    prompt: 'intensely motivated person at standing desk at 5am, surrounded by color-coded productivity books and energy drinks, whiteboard covered in goals, blazer over gym clothes, barely contained manic energy',
    caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
    happiness: 23, salary: '5am wake-up call (unpaid)', outlook: 'Grinding never stops',
  };

  if (isGrinder && wantsBeach) return {
    title: 'Burnout Survivor Currently "Finding Themselves"',
    prompt: 'burnt-out professional on a quiet beach in a wrinkled dress shirt, shoes and briefcase abandoned in the sand, staring at the horizon with a thousand-yard stare as golden sunset light washes over everything',
    caption: 'You worked 80-hour weeks to earn a vacation you are too tired to enjoy.',
    happiness: 51, salary: 'Sabbatical (unpaid)', outlook: 'Recovering',
  };

  if (isGrinder && wantsSurvive) return {
    title: 'Eternal Intern, Distinguished Fellow',
    prompt: 'eager intern in an oversized lanyard badge standing rigidly upright, arms full of a towering stack of papers, surrounded by full-time employees who have already forgotten their name, bright glass modern office',
    caption: 'Three years in and they still have not learned your name. But you persist.',
    happiness: 27, salary: 'School credit (maybe)', outlook: 'Permanent position pending',
  };

  if (isGrinder && noPlan) return {
    title: 'Productivity YouTuber With Zero Productivity',
    prompt: 'productivity creator at an obsessively organized desk, color-coded binders stacked perfectly, six timers running simultaneously, professional camera rig to the side, YouTube channel visible on screen: 12 subscribers',
    caption: 'You spent 6 hours organizing your to-do list. The to-do list has one item: make to-do list.',
    happiness: 40, salary: 'Ad revenue: $1.23', outlook: 'Optimizing the optimization',
  };

  // === TIER 3: Monday + Coworker combos (catch remaining) ===

  if (drinksCoffee && isReliable) return {
    title: 'Chief Coffee Officer and Meeting Survivor',
    prompt: 'bleary-eyed office worker in business casual balancing four coffee cups, staring into the middle distance before a wall calendar blocked solid in red meeting squares, open-plan office buzzing behind them',
    caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
    happiness: 31, salary: 'Benefits include free coffee', outlook: 'One more meeting',
  };

  if (drinksCoffee && isVisionary) return {
    title: 'Caffeinated Prophet of the Next Big Thing',
    prompt: 'wide-eyed visionary at whiteboard with a marker in each hand, frantically connecting everything to everything with circles and arrows, a pyramid of empty coffee cups beside them, late-night office glow',
    caption: 'After cup number seven, you see the future. Unfortunately, nobody else does.',
    happiness: 47, salary: 'Vision-based compensation', outlook: 'Buzzing',
  };

  if (drinksCoffee && isLoner) return {
    title: 'Solo Developer Running on Espresso and Spite',
    prompt: 'solo developer alone in a darkened room, multiple monitors glowing with code, a professional espresso machine built into the desk, noise-cancelling headphones on, expression of total determined focus',
    caption: 'You do not need coworkers. You need a better coffee maker and faster internet.',
    happiness: 72, salary: 'Freelance feast-or-famine', outlook: 'Caffeinated independence',
  };

  if (drinksCoffee && isSnackGuy) return {
    title: 'Office Supply Chain Manager (Unofficial)',
    prompt: 'unsung office hero at their desk surrounded by carefully organized snacks and beverages, multiple food delivery apps open on their phone, grateful colleagues hovering in the background with hopeful eyes',
    caption: 'You keep the team fed and caffeinated. Without you, productivity drops to zero.',
    happiness: 65, salary: 'Expensed meals', outlook: 'Catering budget approved',
  };

  if (suffers && isReliable) return {
    title: 'Senior Associate of Quiet Desperation',
    prompt: 'office worker at their desk wearing a practiced hollow smile, surrounded by pastel sticky notes and a slowly dying succulent, business attire slightly wilted, fluorescent light humming overhead',
    caption: 'You are the backbone of a company that does not know your last name.',
    happiness: 19, salary: 'Competitive (for 2008)', outlook: 'Stable',
  };

  if (suffers && isVisionary) return {
    title: 'Misunderstood Genius in the Wrong Department',
    prompt: 'thoughtful person gazing out a gray cubicle window at a rainy cityscape, leather notebook on the desk filled with brilliant ideas nobody will open, coffee gone cold, quiet visionary expression',
    caption: 'Your ideas could change the company. Unfortunately, they are in a notebook nobody opens.',
    happiness: 22, salary: 'Undervalued', outlook: 'Transfer request pending',
  };

  if (suffers && isLoner) return {
    title: 'Remote Worker Who Forgot What Humans Look Like',
    prompt: 'remote worker in pajamas at a home desk with blackout curtains drawn, laptop open to a video call where everyone looks confused, houseplant visibly dying in the corner, camera covered with a sticky note',
    caption: 'You turned off your camera in 2020 and nobody has seen your face since.',
    happiness: 48, salary: 'Saved on pants budget', outlook: 'Camera permanently off',
  };

  if (suffers && isSnackGuy) return {
    title: 'Comfort Food Therapist (Self-Employed)',
    prompt: 'quietly content person at their desk with an immaculately organized open snack drawer, spreadsheet on screen tracking flavor profiles by emotional state, expression of deep snack-based inner peace',
    caption: 'Your coping mechanism is delicious and your snack drawer has better organization than your life.',
    happiness: 55, salary: 'Snack budget: unlimited', outlook: 'Emotionally stable (when fed)',
  };

  if (sameEveryDay && isReliable) return {
    title: 'Senior Bureaucrat, Department of Doing Things Correctly',
    prompt: 'immaculate civil servant at a perfectly right-angled desk, rubber stamp frozen mid-arc above a crisp official form, tower of identical completed documents beside them, institutional fluorescent light, serene expression',
    caption: 'You have processed 10,000 forms without a single error. Nobody has thanked you once.',
    happiness: 35, salary: 'Government grade (with pension)', outlook: 'Predictably stable',
  };

  if (sameEveryDay && isVisionary) return {
    title: 'Philosopher Who Accidentally Ended Up in Corporate',
    prompt: 'corporate philosopher at their desk, a worn Nietzsche paperback tucked inside a quarterly earnings report, untouched spreadsheet glowing on screen, gazing into the middle distance with quiet existential resignation',
    caption: 'You ponder the meaning of work while doing meaningless work. The irony sustains you.',
    happiness: 43, salary: 'Existentially adequate', outlook: 'Contemplating',
  };

  if (sameEveryDay && isLoner) return {
    title: 'Night Shift Security Guard / Aspiring Novelist',
    prompt: 'night security guard at their station in a vast empty glass-walled building at 3am, well-worn notebook and pen beside surveillance monitors, city lights glimmering outside, profound peaceful solitude',
    caption: 'You guard an empty building and write a novel nobody will read. Both bring you peace.',
    happiness: 61, salary: 'Night differential', outlook: 'Chapter 47 in progress',
  };

  if (sameEveryDay && isSnackGuy) return {
    title: 'Professional Taste Tester (Self-Appointed)',
    prompt: 'supremely serious individual in the corporate break room, clipboard in hand, methodically evaluating each vending machine selection, a ring-binder flavor journal on the counter, confused colleagues watching from a safe distance',
    caption: 'You have reviewed every item in the vending machine. B7 is your magnum opus.',
    happiness: 68, salary: 'Vending machine budget', outlook: 'Flavor matrix expanding',
  };

  if (lovesMon) return {
    title: 'Corporate Optimism Evangelist',
    prompt: 'suspiciously cheerful person in a bright open-plan office, MONDAY MOTIVATION whiteboard glowing behind them, surrounding colleagues visibly edging away, relentlessly positive body language',
    caption: 'Your relentless positivity is both your superpower and why people avoid the break room.',
    happiness: 52, salary: 'Rewarded with enthusiasm', outlook: 'Concerningly positive',
  };

  if (isSnackGuy) return {
    title: 'Senior Falafel Architect, Tel Aviv District',
    prompt: 'confident architect-chef in pristine apron holding structural blueprints made entirely of pita, falafel, and hummus schematics, professional kitchen in background, deadly serious expression, dramatic kitchen spotlight',
    caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
    happiness: 88, salary: 'All the falafel you can eat', outlook: 'Structurally sound',
  };

  if (isLoner) return {
    title: 'Remote Work Pioneer and Professional Hermit',
    prompt: 'triumphant remote worker in comfortable clothes at a six-monitor battlestation, a cat sprawled asleep across the keyboard, blackout curtains, organized chaos of total autonomy, proud sovereign expression',
    caption: 'Your commute is 12 steps and your coworker is a cat who judges you silently.',
    happiness: 94, salary: 'Enough for fiber internet', outlook: 'Do not disturb',
  };

  if (isVisionary) return {
    title: 'Thought Leader Without the Thought',
    prompt: 'impassioned thought leader on a TED-style stage, large screen projecting a wordcloud of pure buzzwords — SYNERGY DISRUPT PIVOT LEVERAGE, gesturing expansively, a single audience member asleep in the front row',
    caption: 'You have vision. You have passion. You have no actionable plan whatsoever.',
    happiness: 46, salary: 'Speaking fees (waived)', outlook: 'Disruption imminent',
  };

  // Ultimate fallback (should be nearly unreachable now)
  return {
    title: 'Professional Human Being (Specialization Pending)',
    prompt: 'person in business casual standing at a literal crossroads in a cinematic twilight landscape, holding a map conspicuously upside down, four weathered road signs pointing in contradictory directions, warm golden hour light',
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
  const imageUrl = buildImageUrl(career.prompt, career.title);
  console.log('[ROUTE] Image URL built — model=flux-realism, seed=' + titleToSeed(career.title));
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

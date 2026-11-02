// The career table. This is the whole "prediction": a deterministic mapping
// from five multiple-choice answers to one of 40 hand-written outcomes. Kept
// free of Express so it can be tested and reused (the public /api/samples
// route renders a few of these for the landing page).
//
// How a career is chosen (docs/quiz-redesign.md):
// - The tabs question (desired_field) picks the shelf: 10 careers per field.
// - Each career names two cues, answers from the other four questions that
//   point at it. The career matching the most of the user's answers wins.
// - Ties go to a stable hash of all five answers, so the same answers always
//   give the same career, and therefore the same cached portrait.
// - The matched answers come back as `evidence`, quoted on the report.
// Cue ids are option ids from quiz.js. careers.test.js checks that every
// career is reachable and that none is picked for more than 4% of all answer
// sets, so a cue edit that unbalances the table fails CI.
const { QUESTION_IDS, optionText, resolveAnswers } = require('./quiz');

const CAREERS = [
  // --- tech ---
  {
    title: 'Founder Waiting for Series A That Will Never Come',
    field: 'tech',
    cues: ['vision', 'bell'],
    caption: 'Your destiny involves pitch decks, empty promises, and a WeWork membership that expires next month.',
    happiness: 18,
    salary: '$0 (pre-revenue)',
    outlook: 'Pivoting to B2B SaaS',
    prompt:
      'A startup founder in his late twenties, South Asian, in a grey zip hoodie, standing alone in a coworking space after hours, holding his phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside his shoulder. Rows of empty desks behind him fade into darkness, one desk lamp the only light',
  },
  {
    title: 'Remote DevOps Engineer Who Blames the Wi-Fi',
    field: 'tech',
    cues: ['asked', 'palms'],
    caption: 'Your deploy pipeline breaks every time a cloud passes over your beach umbrella.',
    happiness: 71,
    salary: 'Contractor rates minus paradise tax',
    outlook: 'Connection unstable',
    prompt:
      'A DevOps engineer in her thirties, a Black woman with short natural hair, in a loose linen shirt, standing barefoot on a bright tropical beach holding her open laptop out at arm\'s length at shoulder height, tilting it toward the sky in search of a signal, eyes narrowed with weary suspicion. One small grey cloud hangs directly over her and casts the only shadow on the whole sunny beach, right on her',
  },
  {
    title: 'JIRA Ticket Archaeologist, Legacy Systems Division',
    field: 'tech',
    cues: ['grind', 'desk'],
    caption: 'You maintain code from 2007 that nobody understands, including the person who wrote it. Especially the person who wrote it.',
    happiness: 34,
    salary: 'Stable but soul-crushing',
    outlook: 'COBOL never dies',
    prompt:
      'A legacy systems engineer in his late fifties, white, with a grey ponytail, wire-rimmed glasses and a head torch, leaning over a dusty beige 1990s computer tower that sits on a steel cart in a dim server room, gently sweeping dust from it with a soft archaeologist\'s brush as if uncovering a fossil, deeply reverent. Rows of server racks recede behind him, lit by one flickering fluorescent tube',
  },
  {
    title: 'Open Source Contributor (0 Stars, 0 Forks)',
    field: 'tech',
    cues: ['ghost', 'thursday'],
    caption: 'You built it. Nobody came. You keep building anyway because the code is the point.',
    happiness: 58,
    salary: 'GitHub sponsorship: $0/mo',
    outlook: 'Waiting for Hacker News',
    prompt:
      'A young programmer in her early twenties, Latina, in a plain grey t-shirt with headphones around her neck, standing proudly behind a small folding table in an empty community hall, presenting her open laptop like a science fair project, its screen turned away from the camera. A full bowl of untouched free sweets sits beside it, and rows of empty folding chairs fill the hall behind her. Light from high windows',
  },
  {
    title: 'Solo Developer Running on Espresso and Spite',
    field: 'tech',
    cues: ['coffee', 'ghost'],
    caption: 'You do not need coworkers. You need a better coffee maker and faster internet.',
    happiness: 72,
    salary: 'Freelance feast-or-famine',
    outlook: 'Caffeinated independence',
    prompt:
      'A solo developer in her forties, Polish, hair tied back, big noise-cancelling headphones on, sitting alone in a dim converted garage at a desk where a large chrome espresso machine stands right beside the keyboard, pulling a shot without looking away from her monitor, jaw set in grim determination. The monitor faces away from the camera and lights her face',
  },
  {
    title: 'UX Designer for an App That Will Be Deprecated',
    field: 'tech',
    cues: ['improv', 'suffer'],
    caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
    happiness: 45,
    salary: 'Paid in stakeholder feedback',
    outlook: 'Figma will fix it',
    prompt:
      'A UX designer in his thirties, Lebanese, neat beard and an oatmeal sweater, standing in a glass meeting room with a brave, optimistic smile, lowering a carefully crafted white paper phone prototype into a cardboard archive box already full of earlier paper prototypes. Behind him the meeting room is being cleared out, chairs stacked upside down on the table. Flat overcast daylight through the glass',
  },
  {
    title: 'Chief Executive of a Declining Startup',
    field: 'tech',
    cues: ['hype', 'bell'],
    caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
    happiness: 12,
    salary: 'Equity in a company worth $0',
    outlook: 'Pivoting aggressively',
    prompt:
      'A startup chief executive in her late thirties, Japanese, sharp black bob and a tailored charcoal suit, standing with hands on hips and unshakable confidence in the middle of a large open-plan office that has been almost entirely cleared out, bare desks and stacked chairs behind her, a wilting fiddle-leaf fig at her side. Late afternoon sun through venetian blinds throws stripes across the room',
  },
  {
    title: 'Remote Worker Who Forgot What Humans Look Like',
    field: 'tech',
    cues: ['same', 'palms'],
    caption: 'You turned off your camera in 2020 and nobody has seen your face since.',
    happiness: 48,
    salary: 'Saved on pants budget',
    outlook: 'Camera permanently off',
    prompt:
      'A remote worker in his twenties, Thai, wearing a dress shirt over pyjama bottoms, sitting at a home desk in a dim room with blackout curtains drawn, holding up a small hand mirror at face height and studying his own reflection with mild, puzzled surprise. The laptop webcam beside him is covered with a strip of tape. A thin blade of daylight slips through a gap in the curtains',
  },
  {
    title: 'Caffeinated Prophet of the Next Big Thing',
    field: 'tech',
    cues: ['coffee', 'translator'],
    caption: 'After cup number seven, you see the future. Unfortunately, nobody else does.',
    happiness: 47,
    salary: 'Vision-based compensation',
    outlook: 'Buzzing',
    prompt:
      'A wide-eyed visionary in his thirties, Ethiopian, in a rumpled shirt, standing in a dark office at night and gazing upward in ecstatic revelation, holding up beside his face a wobbling tower of seven stacked empty paper coffee cups. A single desk lamp lights him from below, the rest of the office in shadow',
  },
  {
    title: 'Prompt Engineer Who Says Please to the Chatbot',
    field: 'tech',
    cues: ['network', 'asked'],
    caption: 'You write three paragraphs of polite context and end every request with thank you. Just in case.',
    happiness: 64,
    salary: 'Paid per token (yours)',
    outlook: 'Staying on its good side',
    prompt:
      'A prompt engineer in his late twenties, a Kenyan man in a soft grey hoodie, sitting very upright at a tidy desk at night and typing on a laptop whose screen faces away from the camera, one hand pressed to his chest in sincere politeness as he leans toward the screen as if apologising to it. A single desk lamp lights him; a small houseplant and a neatly folded napkin sit beside the keyboard',
  },
  // --- creative ---
  {
    title: 'Creative Director of Vibes and Nothing Else',
    field: 'creative',
    cues: ['translator', 'bell'],
    caption: 'Your strategy decks are beautiful. Nobody knows what they mean. That is the strategy.',
    happiness: 53,
    salary: 'Enough for Figma Pro',
    outlook: 'Award-winning but underfunded',
    prompt:
      'A creative director in his forties, white, shaved head, black turtleneck and round tortoiseshell glasses, standing with arms crossed and total confidence beside a large easel in a bare white agency studio. The easel holds one big canvas that is completely blank except for a single small beige dot in the centre, presented as the entire strategy. Soft daylight from a tall window',
  },
  {
    title: 'Travel Photographer Whose Parents Ask When They\'ll Get a Real Job',
    field: 'creative',
    cues: ['improv', 'palms'],
    caption: 'Every sunset is content. Every family dinner is a pitch meeting you did not ask for.',
    happiness: 76,
    salary: '$0.003 per download',
    outlook: 'Golden hour forever',
    prompt:
      'A travel photographer in her late twenties, Filipina, wind-tangled hair and a rain jacket, a professional camera hanging forgotten from her neck, standing on a grassy sea cliff holding her phone to her ear with the patient, tight-lipped smile of someone hearing her mother ask about a real job for the hundredth time. Behind her a spectacular sunset over the ocean goes completely ignored. Soft dusk light',
  },
  {
    title: 'Freelance Idea Generator (Execution Not Included)',
    field: 'creative',
    cues: ['translator', 'thursday'],
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74,
    salary: 'Revenue model TBD',
    outlook: 'Lots of irons in the fire',
    prompt:
      'A freelance creative in her fifties, a Black woman with silver locs and a mustard cardigan, standing in a cluttered home studio holding an unlit light bulb up at shoulder height with both hands like a trophy, beaming with absolute certainty. On the long shelf behind her, softly out of focus, sit dozens of abandoned projects: a half-knitted scarf, half-painted canvases, a half-built birdhouse. Afternoon window light',
  },
  {
    title: 'Graphic Designer Who Dies Inside at Every "Make the Logo Bigger"',
    field: 'creative',
    cues: ['coffee', 'asked'],
    caption: 'Your portfolio is exquisite. Your clients are not. The logo will always need to be bigger.',
    happiness: 29,
    salary: 'Per revision (infinite revisions)',
    outlook: 'One more round of feedback',
    prompt:
      'A graphic designer in her twenties, Vietnamese, black bob and an oversized white shirt, standing in a client\'s office holding up a large white foam board almost entirely filled by one enormous black circle, her expression one of quiet inner devastation. Beside her a client in a suit holds his hands even wider apart, asking for it bigger still. Even overhead office light',
  },
  {
    title: 'Night Shift Security Guard / Aspiring Novelist',
    field: 'creative',
    cues: ['same', 'ghost'],
    caption: 'You guard an empty building and write a novel nobody will read. Both bring you peace.',
    happiness: 61,
    salary: 'Night differential',
    outlook: 'Chapter 47 in progress',
    prompt:
      'A night security guard in his sixties, a Finnish man with a white beard and reading glasses, in a navy guard uniform, sitting at the reception desk of a vast empty glass lobby at three in the morning, typing on a vintage typewriter in total peace, a tall stack of typed pages face down beside him. A desk lamp lights him and the dark city glimmers softly through the glass behind',
  },
  {
    title: 'Misunderstood Genius in the Wrong Department',
    field: 'creative',
    cues: ['vision', 'desk'],
    caption: 'Your ideas could change the company. Unfortunately, they are in a notebook nobody opens.',
    happiness: 22,
    salary: 'Undervalued',
    outlook: 'Transfer request pending',
    prompt:
      'A thoughtful man in his thirties, Native American, long dark hair tied back, in a button-down shirt, sitting in a cramped payroll department cubicle between grey filing cabinets, holding a thick closed leather notebook against his chest with both hands and gazing out of a rain-streaked window at the city with quiet longing. Grey rainy daylight',
  },
  {
    title: 'Philosopher Who Accidentally Ended Up in Corporate',
    field: 'creative',
    cues: ['suffer', 'thursday'],
    caption: 'You ponder the meaning of work while doing meaningless work. The irony sustains you.',
    happiness: 43,
    salary: 'Existentially adequate',
    outlook: 'Contemplating',
    prompt:
      'A corporate analyst in her thirties, Greek, dark curly hair, in a blazer, sitting at an open-plan office desk in the exact pose of Rodin\'s Thinker, chin resting on her fist, contemplating a single paperclip held up in her other hand with profound existential resignation. Her laptop sits closed and untouched. Grey window light across a quiet office',
  },
  {
    title: 'Senior Falafel Architect, Tel Aviv District',
    field: 'creative',
    cues: ['grind', 'lunch'],
    caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
    happiness: 88,
    salary: 'All the falafel you can eat',
    outlook: 'Structurally sound',
    prompt:
      'A falafel architect in his forties, Israeli, in a white shirt with rolled sleeves and an architect\'s white hard hat, at a small Tel Aviv street food counter, checking a tall, precisely stacked tower of falafel balls with a spirit level, hummus spread between the layers like mortar, deadly serious. Soft Mediterranean daylight on the pale stone street behind him',
  },
  {
    title: 'Eternal Intern, Distinguished Fellow',
    field: 'creative',
    cues: ['hype', 'desk'],
    caption: 'Three years in and they still have not learned your name. But you persist.',
    happiness: 27,
    salary: 'School credit (maybe)',
    outlook: 'Permanent position pending',
    prompt:
      'An eager intern in her early twenties, Indonesian, in a neat blouse, standing bolt upright in a busy office corridor holding a cardboard tray of six coffees at chest height with a hopeful smile, while full-time employees stream past her on both sides without a glance. Bright, even office light through glass partitions',
  },
  {
    title: 'Screenwriter Who Has Been on Page 30 Since 2021',
    field: 'creative',
    cues: ['network', 'ghost'],
    caption: 'Act one is flawless. It has been flawless for five years. Act two is a rumour.',
    happiness: 57,
    salary: 'Option fee (theoretical)',
    outlook: 'Rewriting page 30',
    prompt:
      'A screenwriter in her forties, an Argentinian woman with a loose bun and reading glasses pushed up into her hair, sitting in a small cafe corner behind an open laptop turned away from the camera, staring into the middle distance with a pen between her teeth. A squared stack of thirty blank pages sits beside a cold, untouched cappuccino. Soft window light and one pendant lamp',
  },
  // --- finance ---
  {
    title: 'Crypto Hedge Fund Manager (Funds: $847)',
    field: 'finance',
    cues: ['hype', 'bell'],
    caption: 'Your portfolio is 98% down but your confidence remains at an all-time high.',
    happiness: 11,
    salary: '$847 AUM',
    outlook: 'Waiting for the dip to recover',
    prompt:
      'A crypto hedge fund manager in her late twenties, Turkish, sleek dark ponytail and a sharp navy power suit, seated at a wobbly folding card table in a tiny rented kitchen, posing like a billionaire for a power portrait with chin raised and fingers steepled. On the table in front of her sits a small glass jar holding a few crumpled banknotes and coins, the whole fund. One bare ceiling bulb',
  },
  {
    title: 'Offshore Tax Consultant (Legally Speaking)',
    field: 'finance',
    cues: ['network', 'palms'],
    caption: 'You optimize other people\'s money from a place where your own money is optimized.',
    happiness: 69,
    salary: 'Tax-efficient',
    outlook: 'Cayman Islands adjacent',
    prompt:
      'An offshore tax consultant in her sixties, white, silver bob, cream linen suit, sitting perfectly composed at a polished wooden office desk that stands in the shallow surf of an empty white sand beach, hands folded, a closed leather briefcase and a cup of tea on a saucer on the desk. Gentle waves lap at the desk legs. Bright, hazy tropical daylight',
  },
  {
    title: 'Junior Analyst Who Ages 10 Years Per Quarter',
    field: 'finance',
    cues: ['coffee', 'asked'],
    caption: 'Your pivot tables are immaculate. Your will to live is less so.',
    happiness: 15,
    salary: 'Golden handcuffs',
    outlook: 'Bonus season pending',
    prompt:
      'A junior finance analyst aged twenty-three, Korean, already showing streaks of premature grey at his temples, loosened tie and rolled shirtsleeves, sitting at his desk at two in the morning, clutching a large paper coffee cup in both hands at chest height and staring straight ahead with hollow eyes. The open-plan office behind him is dark and empty. Lit by the cold light of his monitor and one fluorescent panel',
  },
  {
    title: 'Day Trader Who Calls It "Research"',
    field: 'finance',
    cues: ['same', 'thursday'],
    caption: 'Your watchlist has 200 tickers. Your portfolio has 3. Your mother is concerned.',
    happiness: 44,
    salary: 'Unrealized gains',
    outlook: 'Diamond hands',
    prompt:
      'A day trader in his forties, a Black man in reading glasses, wearing a terry bathrobe over a shirt and tie, sitting at a kitchen table and leaning toward his laptop with the furrowed focus of a scholar, chin on fist, the screen facing away from the camera. In the soft-focus doorway behind him his elderly mother stands holding a mug, watching him with quiet concern. Morning window light',
  },
  {
    title: 'Senior Associate of Quiet Desperation',
    field: 'finance',
    cues: ['suffer', 'asked'],
    caption: 'You are the backbone of a company that does not know your last name.',
    happiness: 19,
    salary: 'Competitive (for 2008)',
    outlook: 'Stable',
    prompt:
      'A senior associate in her forties, Korean American, in a cardigan and pearl earrings, sitting perfectly upright at a beige cubicle desk, holding a small slice of someone else\'s farewell cake on a paper plate and wearing a practised, hollow, polite smile. A drooping succulent sits beside her keyboard. Fluorescent panels overhead, colleagues chatting far away in the background',
  },
  {
    title: 'Retired Management Consultant (Age 29)',
    field: 'finance',
    cues: ['vision', 'palms'],
    caption: 'You disrupted your own career by strategically doing nothing. Bold move.',
    happiness: 82,
    salary: 'Savings running out',
    outlook: 'Advising from the hammock',
    prompt:
      'A former management consultant aged twenty-nine, Brazilian, in a crisp blue oxford shirt with the tie loosened and swim shorts, lying back in a hammock strung between two palms, eyes closed in complete peace, a whiteboard marker still tucked behind one ear and a closed laptop resting on his chest. His head and shoulders sit in the centre of the frame. Dappled shade under the palm leaves',
  },
  {
    title: 'Middle Manager Who Peaked at the Strategy Offsite',
    field: 'finance',
    cues: ['translator', 'desk'],
    caption: 'Your SWOT analysis was legendary. That was 2019. You have been coasting since.',
    happiness: 38,
    salary: 'Band 4 (ceiling reached)',
    outlook: 'Restructuring imminent',
    prompt:
      'A middle manager in his fifties, white, in a tucked-in polo shirt and khakis, standing alone in an emptied hotel function room, holding a small blank crystal award against his chest with both hands and gazing wistfully into the middle distance. Behind him the chairs are stacked against the wall and a cleaner vacuums the carpet. Flat fluorescent light mixed with grey window light',
  },
  {
    title: 'Strategy Consultant for Problems That Don\'t Exist',
    field: 'finance',
    cues: ['improv', 'translator'],
    caption: 'You solve problems that nobody has, and you charge by the hour for it.',
    happiness: 56,
    salary: 'Retainer-based fiction',
    outlook: 'Synergy pending',
    prompt:
      'A strategy consultant in her forties, Indian, in a tailored camel blazer, standing in a bright, sparse office and gesturing with grave urgency at a perfectly ordinary office water cooler as if presenting a crisis. A puzzled facilities worker in overalls stands on the other side of the water cooler, looking at it and then at her. Clean daylight from floor-to-ceiling windows',
  },
  {
    title: 'Senior Bureaucrat, Department of Doing Things Correctly',
    field: 'finance',
    cues: ['grind', 'desk'],
    caption: 'You have processed 10,000 forms without a single error. Nobody has thanked you once.',
    happiness: 35,
    salary: 'Government grade (with pension)',
    outlook: 'Predictably stable',
    prompt:
      'A civil servant in his sixties, Ghanaian, in an impeccable grey suit and tie, sitting at a perfectly ordered wooden desk with a rubber stamp raised mid-air at chest height above a single blank form, an exactly squared tower of identical blank forms beside him reaching his shoulder. Serene, precise expression. Institutional fluorescent light and a tall office window',
  },
  {
    title: 'Chief Coffee Officer and Meeting Survivor',
    field: 'finance',
    cues: ['coffee', 'lunch'],
    caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
    happiness: 31,
    salary: 'Benefits include free coffee',
    outlook: 'One more meeting',
    prompt:
      'An office worker in her fifties, Irish, auburn hair, reading glasses on a chain and a navy cardigan, walking out of one glass meeting room straight toward the next, carrying a cardboard tray of four coffees against her chest with a laptop clamped under one arm, eyes glazed with heroic fatigue. Colleagues sit in meetings behind every glass wall. Flat office daylight',
  },
  // --- viral ---
  {
    title: 'Content Creator, Currently at 23 Followers',
    field: 'viral',
    cues: ['hype', 'bell'],
    caption: 'Fame is just one viral video away. You have been saying this for three years.',
    happiness: 62,
    salary: '$0.04 in ad revenue',
    outlook: 'The algorithm will come around',
    prompt:
      'An aspiring content creator in her early twenties, Nigerian, in a bright matching two-piece outfit, mid-performance in a small tidy bedroom, framing her face with both hands and giving a huge enthusiastic smile to a phone mounted in a ring light. Her entire live audience is her grandmother, sitting on the edge of the bed behind her and watching politely with folded hands. The ring light is the main light',
  },
  {
    title: 'LinkedIn Influencer Emeritus',
    field: 'viral',
    cues: ['network', 'desk'],
    caption: 'Your network is your net worth, and both are currently in the red.',
    happiness: 41,
    salary: 'Paid in exposure',
    outlook: 'Open to opportunities',
    prompt:
      'A veteran networking influencer in his sixties, a silver-haired Black man in a navy blazer over a turtleneck with a headset microphone, delivering an impassioned keynote from behind a lectern with both arms spread wide, to a conference room that is entirely empty except for one folding chair with a coat draped over it. One spotlight from above, the rest of the room dim',
  },
  {
    title: 'Digital Nomad Coach (Currently Offline)',
    field: 'viral',
    cues: ['vision', 'palms'],
    caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
    happiness: 55,
    salary: 'Location-independent poverty',
    outlook: 'Vibes-based strategy',
    prompt:
      'A digital nomad coach in her thirties, Swedish, in a wide sun hat and white linen, sitting on a rock in a remote, empty cove with her laptop open on her knees, holding up the loose end of a long orange extension cable at chest height and studying it with serene confusion. The cable trails away across the sand to nothing. A few goats graze on the hillside behind her. Soft overcast light',
  },
  {
    title: 'Productivity YouTuber With Zero Productivity',
    field: 'viral',
    cues: ['same', 'thursday'],
    caption: 'You spent 6 hours organizing your to-do list. The to-do list has one item: make to-do list.',
    happiness: 40,
    salary: 'Ad revenue: $1.23',
    outlook: 'Optimizing the optimization',
    prompt:
      'A productivity creator in his twenties, white, neat side-parted hair and a crisp button-down, sitting at an immaculate minimalist desk with a camera on a boom arm pointed at him, using a steel ruler to align a single pen perfectly parallel to a closed notebook, a row of six identical pens already spaced evenly beside it. Soft window light and one desk lamp',
  },
  {
    title: 'Thought Leader Without the Thought',
    field: 'viral',
    cues: ['translator', 'bell'],
    caption: 'You have vision. You have passion. You have no actionable plan whatsoever.',
    happiness: 46,
    salary: 'Speaking fees (waived)',
    outlook: 'Disruption imminent',
    prompt:
      'A thought leader in his thirties, white, in a black t-shirt under a blazer with a headset microphone, standing on a round red carpet on a conference stage, arms spread wide in a grand visionary gesture in front of a giant projection screen that is completely blank white. In the dim front row a single audience member is asleep. One spotlight on the speaker',
  },
  {
    title: 'VP of Hustle Culture, Self-Appointed',
    field: 'viral',
    cues: ['grind', 'coffee'],
    caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
    happiness: 23,
    salary: '5am wake-up call (unpaid)',
    outlook: 'Grinding never stops',
    prompt:
      'A self-appointed hustle executive in her thirties, Black British, in a blazer over gym leggings, walking briskly on a treadmill desk at five in the morning in a dark apartment, wireless earbuds in, gripping a tall green smoothie at chest height, eyes wide with barely contained intensity. Blue pre-dawn light at the window and a single desk lamp',
  },
  {
    title: 'Burnout Survivor Currently "Finding Themselves"',
    field: 'viral',
    cues: ['suffer', 'palms'],
    caption: 'You worked 80-hour weeks to earn a vacation you are too tired to enjoy.',
    happiness: 51,
    salary: 'Sabbatical (unpaid)',
    outlook: 'Recovering',
    prompt:
      'A burnt-out professional in his forties, Chinese American, in a wrinkled white dress shirt and suit trousers, sitting cross-legged on a mat in a calm meditation retreat hall among serene people in loose linen who all have their eyes closed. His eyes are wide open in a thousand-yard stare, his phone face-down on the mat in front of him. Soft daylight through paper screens and wooden beams',
  },
  {
    title: 'Professional Taste Tester (Self-Appointed)',
    field: 'viral',
    cues: ['same', 'lunch'],
    caption: 'You have reviewed every item in the vending machine. B7 is your magnum opus.',
    happiness: 68,
    salary: 'Vending machine budget',
    outlook: 'Flavor matrix expanding',
    prompt:
      'A self-appointed taste tester in her forties, Peruvian, in a neat office blouse, standing in a corporate break room in front of a vending machine, holding a single plain foil packet of crisps up to the light and inspecting it through a jeweller\'s loupe with grave professional seriousness. Two colleagues watch from the doorway at a safe distance. Fluorescent break-room light',
  },
  {
    title: 'Corporate Event Planner Nobody Invited',
    field: 'viral',
    cues: ['improv', 'asked'],
    caption: 'You organized the team-building retreat. Three people came. One was from IT support.',
    happiness: 33,
    salary: 'Per-event basis',
    outlook: 'RSVP pending',
    prompt:
      'A corporate event planner in his thirties, Puerto Rican, in a headset and a neat lilac shirt, standing under a sagging balloon arch in a hotel ballroom and holding out a large tray of identical cupcakes at chest height with a brave, hopeful smile. Behind him a long banquet table set for thirty has only three guests, standing far apart and avoiding eye contact. Ballroom chandeliers and grey window light',
  },
  {
    title: 'Podcast Host, Listener Count: Mom',
    field: 'viral',
    cues: ['improv', 'ghost'],
    caption: 'Episode 112 is out. The analytics show one listener in one city. She always listens to the end.',
    happiness: 79,
    salary: 'Sponsored by your own savings',
    outlook: 'Renewed for season 9',
    prompt:
      'A podcast host in his thirties, a Mexican American man in a cardigan, leaning into a large studio microphone with headphones on in a spare bedroom lined with plain grey acoustic foam, mid-sentence and gesturing with real passion. Through the open doorway behind him his mother sits on a sofa with a single earbud in, giving him a supportive thumbs up. One warm desk lamp',
  },
];

// Shown only if answers can't be resolved (validation normally stops that
// first). Not reachable from the quiz on purpose.
const FALLBACK = {
  title: 'Professional Human Being (Specialization Pending)',
  caption: 'You defy every algorithm, every matrix, and every career quiz. HR has given up classifying you.',
  happiness: 50,
  salary: 'Negotiable (probably not)',
  outlook: 'Beautifully undefined',
  prompt:
    'A person in their thirties of mixed heritage, with a cropped haircut, in business casual, standing at a rural crossroads on a wide flat plain, holding a paper map upside down at chest height with a calm, unbothered expression. Beside them a weathered wooden signpost at head height points four blank arms in four different directions. Flat overcast light and a pale sky',
};

const CUE_QUESTIONS = QUESTION_IDS.filter((q) => q !== 'desired_field');

/**
 * answers: { strength, monday_vibe, coworker_desc, five_year_goal,
 * desired_field } as the option text the client sends. Returns the career
 * plus `evidence`, two of the user's own answers that explain the pick.
 */
function mapCareer(answers) {
  const ids = resolveAnswers(answers);
  if (!ids) return { ...FALLBACK, evidence: [] };

  const picked = new Set(CUE_QUESTIONS.map((q) => ids[q]));
  const shelf = CAREERS.filter((c) => c.field === ids.desired_field);
  const score = (career) => career.cues.filter((cue) => picked.has(cue)).length;
  const best = Math.max(...shelf.map(score));
  const tied = shelf.filter((c) => score(c) === best);
  const career = tied[answersHash(QUESTION_IDS.map((q) => ids[q])) % tied.length];

  return { ...publicFields(career), evidence: evidenceFor(career, ids) };
}

// The user's answers that matched this career's cues, topped up with their
// field answer so the report can always quote two.
function evidenceFor(career, ids) {
  const quotes = CUE_QUESTIONS.filter((q) => career.cues.includes(ids[q])).map((q) => optionText(q, ids[q]));
  if (quotes.length < 2) quotes.push(optionText('desired_field', ids.desired_field));
  return quotes.slice(0, 2);
}

// Routing data (field, cues) stays on the server side of this module.
function publicFields({ title, caption, happiness, salary, outlook, prompt }) {
  return { title, caption, happiness, salary, outlook, prompt };
}

// FNV-1a over the joined option ids. Deterministic across processes and Node
// versions. Hashing ids rather than text keeps a result stable if an option
// is only re-punctuated.
function answersHash(parts) {
  let h = 0x811c9dc5;
  for (const ch of parts.join('\u0000')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Answer sets (as option ids) that land on the careers shown on the landing
// page. careers.test.js asserts each maps to the title beside it, and
// client/src/content.js SAMPLE_TITLES must list the same titles in order.
const SAMPLE_ANSWERS = [
  ['Founder Waiting for Series A That Will Never Come', ['vision', 'coffee', 'asked', 'bell', 'tech']],
  ['JIRA Ticket Archaeologist, Legacy Systems Division', ['grind', 'coffee', 'asked', 'desk', 'tech']],
  ['Senior Associate of Quiet Desperation', ['vision', 'suffer', 'asked', 'bell', 'finance']],
  ['Senior Falafel Architect, Tel Aviv District', ['grind', 'coffee', 'lunch', 'bell', 'creative']],
  ['Solo Developer Running on Espresso and Spite', ['vision', 'coffee', 'ghost', 'bell', 'tech']],
  ['Remote DevOps Engineer Who Blames the Wi-Fi', ['vision', 'coffee', 'asked', 'palms', 'tech']],
  ['Thought Leader Without the Thought', ['vision', 'coffee', 'translator', 'bell', 'viral']],
  ['Night Shift Security Guard / Aspiring Novelist', ['vision', 'same', 'ghost', 'bell', 'creative']],
];

/** Option ids in question order to the { questionId: text } shape mapCareer takes. */
function answersFromIds(optionIds) {
  return Object.fromEntries(QUESTION_IDS.map((q, i) => [q, optionText(q, optionIds[i])]));
}

function sampleCareers() {
  return SAMPLE_ANSWERS.map(([, ids]) => mapCareer(answersFromIds(ids)));
}

module.exports = { mapCareer, CAREERS, FALLBACK, SAMPLE_ANSWERS, answersFromIds, sampleCareers };

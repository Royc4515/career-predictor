// The career rule table. This is the whole "prediction": a deterministic
// mapping from five multiple-choice answers to one of ~45 hand-written
// outcomes (44 reachable from the quiz; the 45th is the safety fallback). Kept free of Express so it can be tested and reused (the public
// /api/samples route renders a few of these for the landing page).

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

  // don't touch / Every tier proposes its first match and a stable hash of all
  // five answers picks among the proposals. A plain first-match cascade let
  // tier 1 (field + goal) win for every quiz submission, because the client
  // always sends both, which left 32 of the 45 careers unreachable.
  const tiers = [
    () => {
      // === TIER 1: Field + Goal combos (most specific) ===

      if (isTech && wantsCEO) return {
        title: 'Founder Waiting for Series A That Will Never Come',
        prompt: 'A startup founder in his late twenties, South Asian, in a grey zip hoodie, standing alone in a coworking space after hours, holding his phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside his shoulder. Rows of empty desks behind him fade into darkness, one desk lamp the only light',
        caption: 'Your destiny involves pitch decks, empty promises, and a WeWork membership that expires next month.',
        happiness: 18, salary: '$0 (pre-revenue)', outlook: 'Pivoting to B2B SaaS',
      };

      if (isTech && wantsBeach) return {
        title: 'Remote DevOps Engineer Who Blames the Wi-Fi',
        prompt: 'A DevOps engineer in her thirties, a Black woman with short natural hair, in a loose linen shirt, standing barefoot on a bright tropical beach holding her open laptop out at arm\'s length at shoulder height, tilting it toward the sky in search of a signal, eyes narrowed with weary suspicion. One small grey cloud hangs directly over her and casts the only shadow on the whole sunny beach, right on her',
        caption: 'Your deploy pipeline breaks every time a cloud passes over your beach umbrella.',
        happiness: 71, salary: 'Contractor rates minus paradise tax', outlook: 'Connection unstable',
      };

      if (isTech && wantsSurvive) return {
        title: 'JIRA Ticket Archaeologist, Legacy Systems Division',
        prompt: 'A legacy systems engineer in his late fifties, white, with a grey ponytail, wire-rimmed glasses and a head torch, leaning over a dusty beige 1990s computer tower that sits on a steel cart in a dim server room, gently sweeping dust from it with a soft archaeologist\'s brush as if uncovering a fossil, deeply reverent. Rows of server racks recede behind him, lit by one flickering fluorescent tube',
        caption: 'You maintain code from 2007 that nobody understands, including the person who wrote it. Especially the person who wrote it.',
        happiness: 34, salary: 'Stable but soul-crushing', outlook: 'COBOL never dies',
      };

      if (isTech && noPlan) return {
        title: 'Open Source Contributor (0 Stars, 0 Forks)',
        prompt: 'A young programmer in her early twenties, Latina, in a plain grey t-shirt with headphones around her neck, standing proudly behind a small folding table in an empty community hall, presenting her open laptop like a science fair project, its screen turned away from the camera. A full bowl of untouched free sweets sits beside it, and rows of empty folding chairs fill the hall behind her. Light from high windows',
        caption: 'You built it. Nobody came. You keep building anyway because the code is the point.',
        happiness: 58, salary: 'GitHub sponsorship: $0/mo', outlook: 'Waiting for Hacker News',
      };

      if (isCreativeField && wantsCEO) return {
        title: 'Creative Director of Vibes and Nothing Else',
        prompt: 'A creative director in his forties, white, shaved head, black turtleneck and round tortoiseshell glasses, standing with arms crossed and total confidence beside a large easel in a bare white agency studio. The easel holds one big canvas that is completely blank except for a single small beige dot in the centre, presented as the entire strategy. Soft daylight from a tall window',
        caption: 'Your strategy decks are beautiful. Nobody knows what they mean. That is the strategy.',
        happiness: 53, salary: 'Enough for Figma Pro', outlook: 'Award-winning but underfunded',
      };

      if (isCreativeField && wantsBeach) return {
        title: 'Travel Photographer Whose Parents Ask When They\'ll Get a Real Job',
        prompt: 'A travel photographer in her late twenties, Filipina, wind-tangled hair and a rain jacket, a professional camera hanging forgotten from her neck, standing on a grassy sea cliff holding her phone to her ear with the patient, tight-lipped smile of someone hearing her mother ask about a real job for the hundredth time. Behind her a spectacular sunset over the ocean goes completely ignored. Soft dusk light',
        caption: 'Every sunset is content. Every family dinner is a pitch meeting you did not ask for.',
        happiness: 76, salary: '$0.003 per download', outlook: 'Golden hour forever',
      };

      if (isCreativeField && wantsSurvive) return {
        title: 'UX Designer for an App That Will Be Deprecated',
        prompt: 'A UX designer in his thirties, Lebanese, neat beard and an oatmeal sweater, standing in a glass meeting room with a brave, optimistic smile, lowering a carefully crafted white paper phone prototype into a cardboard archive box already full of earlier paper prototypes. Behind him the meeting room is being cleared out, chairs stacked upside down on the table. Flat overcast daylight through the glass',
        caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
        happiness: 45, salary: 'Enough for Figma Pro', outlook: 'Figma will fix it',
      };

      if (isCreativeField) return { // noPlan
        title: 'Freelance Idea Generator (Execution Not Included)',
        prompt: 'A freelance creative in her fifties, a Black woman with silver locs and a mustard cardigan, standing in a cluttered home studio holding an unlit light bulb up at shoulder height with both hands like a trophy, beaming with absolute certainty. On the long shelf behind her, softly out of focus, sit dozens of abandoned projects: a half-knitted scarf, half-painted canvases, a half-built birdhouse. Afternoon window light',
        caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
        happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
      };

      if (isFinance && wantsCEO) return {
        title: 'Crypto Hedge Fund Manager (Funds: $847)',
        prompt: 'A crypto hedge fund manager in her late twenties, Turkish, sleek dark ponytail and a sharp navy power suit, seated at a wobbly folding card table in a tiny rented kitchen, posing like a billionaire for a power portrait with chin raised and fingers steepled. On the table in front of her sits a small glass jar holding a few crumpled banknotes and coins, the whole fund. One bare ceiling bulb',
        caption: 'Your portfolio is 98% down but your confidence remains at an all-time high.',
        happiness: 11, salary: '$847 AUM', outlook: 'Waiting for the dip to recover',
      };

      if (isFinance && wantsBeach) return {
        title: 'Offshore Tax Consultant (Legally Speaking)',
        prompt: 'An offshore tax consultant in her sixties, white, silver bob, cream linen suit, sitting perfectly composed at a polished wooden office desk that stands in the shallow surf of an empty white sand beach, hands folded, a closed leather briefcase and a cup of tea on a saucer on the desk. Gentle waves lap at the desk legs. Bright, hazy tropical daylight',
        caption: 'You optimize other people\'s money from a place where your own money is optimized.',
        happiness: 69, salary: 'Tax-efficient', outlook: 'Cayman Islands adjacent',
      };

      if (isFinance && wantsSurvive) return {
        title: 'Junior Analyst Who Ages 10 Years Per Quarter',
        prompt: 'A junior finance analyst aged twenty-three, Korean, already showing streaks of premature grey at his temples, loosened tie and rolled shirtsleeves, sitting at his desk at two in the morning, clutching a large paper coffee cup in both hands at chest height and staring straight ahead with hollow eyes. The open-plan office behind him is dark and empty. Lit by the cold light of his monitor and one fluorescent panel',
        caption: 'Your pivot tables are immaculate. Your will to live is less so.',
        happiness: 15, salary: 'Golden handcuffs', outlook: 'Bonus season pending',
      };

      if (isFinance) return { // noPlan
        title: 'Day Trader Who Calls It "Research"',
        prompt: 'A day trader in his forties, a Black man in reading glasses, wearing a terry bathrobe over a shirt and tie, sitting at a kitchen table and leaning toward his laptop with the furrowed focus of a scholar, chin on fist, the screen facing away from the camera. In the soft-focus doorway behind him his elderly mother stands holding a mug, watching him with quiet concern. Morning window light',
        caption: 'Your watchlist has 200 tickers. Your portfolio has 3. Your mother is concerned.',
        happiness: 44, salary: 'Unrealized gains', outlook: 'Diamond hands',
      };

      if (wantsViral) return {
        title: 'Content Creator, Currently at 23 Followers',
        prompt: 'An aspiring content creator in her early twenties, Nigerian, in a bright matching two-piece outfit, mid-performance in a small tidy bedroom, framing her face with both hands and giving a huge enthusiastic smile to a phone mounted in a ring light. Her entire live audience is her grandmother, sitting on the edge of the bed behind her and watching politely with folded hands. The ring light is the main light',
        caption: 'Fame is just one viral video away. You have been saying this for three years.',
        happiness: 62, salary: '$0.04 in ad revenue', outlook: 'The algorithm will come around',
      };

      return null;
    },
    () => {
      // === TIER 2: Strength + Goal combos ===

      if (isLeader && wantsCEO) return {
        title: 'Chief Executive of a Declining Startup',
        prompt: 'A startup chief executive in her late thirties, Japanese, sharp black bob and a tailored charcoal suit, standing with hands on hips and unshakable confidence in the middle of a large open-plan office that has been almost entirely cleared out, bare desks and stacked chairs behind her, a wilting fiddle-leaf fig at her side. Late afternoon sun through venetian blinds throws stripes across the room',
        caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
        happiness: 12, salary: 'Equity in a company worth $0', outlook: 'Pivoting aggressively',
      };

      if (isLeader && wantsBeach) return {
        title: 'Retired Management Consultant (Age 29)',
        prompt: 'A former management consultant aged twenty-nine, Brazilian, in a crisp blue oxford shirt with the tie loosened and swim shorts, lying back in a hammock strung between two palms, eyes closed in complete peace, a whiteboard marker still tucked behind one ear and a closed laptop resting on his chest. His head and shoulders sit in the centre of the frame. Dappled shade under the palm leaves',
        caption: 'You disrupted your own career by strategically doing nothing. Bold move.',
        happiness: 82, salary: 'Savings running out', outlook: 'Advising from the hammock',
      };

      if (isLeader && wantsSurvive) return {
        title: 'Middle Manager Who Peaked at the Strategy Offsite',
        prompt: 'A middle manager in his fifties, white, in a tucked-in polo shirt and khakis, standing alone in an emptied hotel function room, holding a small blank crystal award against his chest with both hands and gazing wistfully into the middle distance. Behind him the chairs are stacked against the wall and a cleaner vacuums the carpet. Flat fluorescent light mixed with grey window light',
        caption: 'Your SWOT analysis was legendary. That was 2019. You have been coasting since.',
        happiness: 38, salary: 'Band 4 (ceiling reached)', outlook: 'Restructuring imminent',
      };

      if (isLeader && noPlan) return {
        title: 'Strategy Consultant for Problems That Don\'t Exist',
        prompt: 'A strategy consultant in her forties, Indian, in a tailored camel blazer, standing in a bright, sparse office and gesturing with grave urgency at a perfectly ordinary office water cooler as if presenting a crisis. A puzzled facilities worker in overalls stands on the other side of the water cooler, looking at it and then at her. Clean daylight from floor-to-ceiling windows',
        caption: 'You solve problems that nobody has, and you charge by the hour for it.',
        happiness: 56, salary: 'Retainer-based fiction', outlook: 'Synergy pending',
      };

      if (isNetworker && wantsCEO) return {
        title: 'LinkedIn Influencer Emeritus',
        prompt: 'A veteran networking influencer in his sixties, a silver-haired Black man in a navy blazer over a turtleneck with a headset microphone, delivering an impassioned keynote from behind a lectern with both arms spread wide, to a conference room that is entirely empty except for one folding chair with a coat draped over it. One spotlight from above, the rest of the room dim',
        caption: 'Your network is your net worth, and both are currently in the red.',
        happiness: 41, salary: 'Paid in exposure', outlook: 'Open to opportunities',
      };

      if (isNetworker && wantsBeach) return {
        title: 'Digital Nomad Coach (Currently Offline)',
        prompt: 'A digital nomad coach in her thirties, Swedish, in a wide sun hat and white linen, sitting on a rock in a remote, empty cove with her laptop open on her knees, holding up the loose end of a long orange extension cable at chest height and studying it with serene confusion. The cable trails away across the sand to nothing. A few goats graze on the hillside behind her. Soft overcast light',
        caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
        happiness: 55, salary: 'Location-independent poverty', outlook: 'Vibes-based strategy',
      };

      if (isNetworker && wantsSurvive) return {
        title: 'Corporate Event Planner Nobody Invited',
        prompt: 'A corporate event planner in his thirties, Puerto Rican, in a headset and a neat lilac shirt, standing under a sagging balloon arch in a hotel ballroom and holding out a large tray of identical cupcakes at chest height with a brave, hopeful smile. Behind him a long banquet table set for thirty has only three guests, standing far apart and avoiding eye contact. Ballroom chandeliers and grey window light',
        caption: 'You organized the team-building retreat. Three people came. One was from IT support.',
        happiness: 33, salary: 'Per-event basis', outlook: 'RSVP pending',
      };

      if (isNetworker && noPlan) return {
        title: 'Professional Networker (Job Title Unclear)',
        prompt: 'A professional networker in her late twenties, Chinese, in a smart blazer, at a busy industry mixer, shaking hands with one stranger while already reaching her other hand out to a second stranger arriving, beaming the same bright smile at both. A paper coffee cup is tucked in the crook of her elbow. Warm cafe light, the crowd softly blurred behind her',
        caption: 'You know everyone and no one knows what you actually do. Including you.',
        happiness: 49, salary: 'Coffee meetings (expensed)', outlook: 'Let me introduce you to someone',
      };

      if (isCreative && wantsCEO) return {
        title: 'Chief Vibes Officer at a Company of One',
        prompt: 'A solo founder in his forties, Samoan, in a bold patterned shirt and a call-centre headset, standing proudly in a converted closet that serves as his entire company, holding a mop in one hand and raising a coffee mug in the other like a toast. A tiny desk with a laptop and a crowd of houseplants fill the space around him. One warm desk lamp and a small window',
        caption: 'You are the CEO, CTO, and janitor. The company is you. Revenue is optional.',
        happiness: 63, salary: 'Passion-based economy', outlook: 'Manifesting growth',
      };

      if (isCreative && wantsBeach) return {
        title: 'Professional Sunset Photographer for Stock Sites Nobody Uses',
        prompt: 'A stock photographer in his sixties, Scottish, white beard, bucket hat and a many-pocketed vest, standing on a flat empty beach at sunset behind a row of five tripods at chest height, all aimed at the same sunset, adjusting one of them with grave seriousness. Nobody else is on the beach. The low sun sits behind him in soft, hazy, muted colour',
        caption: 'Golden hour is your office, and zero downloads is your quarterly report.',
        happiness: 67, salary: '$0.003 per download', outlook: 'Chasing the light',
      };

      if (isCreative && wantsSurvive) return {
        title: 'Graphic Designer Who Dies Inside at Every "Make the Logo Bigger"',
        prompt: 'A graphic designer in her twenties, Vietnamese, black bob and an oversized white shirt, standing in a client\'s office holding up a large white foam board almost entirely filled by one enormous black circle, her expression one of quiet inner devastation. Beside her a client in a suit holds his hands even wider apart, asking for it bigger still. Even overhead office light',
        caption: 'Your portfolio is exquisite. Your clients are not. The logo will always need to be bigger.',
        happiness: 29, salary: 'Per revision (infinite revisions)', outlook: 'One more round of feedback',
      };

      if (isCreative && noPlan) return {
        title: 'Freelance Idea Generator (Execution Not Included)',
        prompt: 'A freelance creative in his twenties, Moroccan, in a paint-splattered denim jacket, standing in a sunny warehouse studio and pinning one more blank white index card to a cork wall already covered edge to edge with hundreds of blank index cards, glancing back over his shoulder with a look of pure delight. Unfinished canvases lean against the wall. Afternoon light from a skylight',
        caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
        happiness: 74, salary: 'Revenue model TBD', outlook: 'Lots of irons in the fire',
      };

      if (isGrinder && wantsCEO) return {
        title: 'VP of Hustle Culture, Self-Appointed',
        prompt: 'A self-appointed hustle executive in her thirties, Black British, in a blazer over gym leggings, walking briskly on a treadmill desk at five in the morning in a dark apartment, wireless earbuds in, gripping a tall green smoothie at chest height, eyes wide with barely contained intensity. Blue pre-dawn light at the window and a single desk lamp',
        caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
        happiness: 23, salary: '5am wake-up call (unpaid)', outlook: 'Grinding never stops',
      };

      if (isGrinder && wantsBeach) return {
        title: 'Burnout Survivor Currently "Finding Themselves"',
        prompt: 'A burnt-out professional in his forties, Chinese American, in a wrinkled white dress shirt and suit trousers, sitting cross-legged on a mat in a calm meditation retreat hall among serene people in loose linen who all have their eyes closed. His eyes are wide open in a thousand-yard stare, his phone face-down on the mat in front of him. Soft daylight through paper screens and wooden beams',
        caption: 'You worked 80-hour weeks to earn a vacation you are too tired to enjoy.',
        happiness: 51, salary: 'Sabbatical (unpaid)', outlook: 'Recovering',
      };

      if (isGrinder && wantsSurvive) return {
        title: 'Eternal Intern, Distinguished Fellow',
        prompt: 'An eager intern in her early twenties, Indonesian, in a neat blouse, standing bolt upright in a busy office corridor holding a cardboard tray of six coffees at chest height with a hopeful smile, while full-time employees stream past her on both sides without a glance. Bright, even office light through glass partitions',
        caption: 'Three years in and they still have not learned your name. But you persist.',
        happiness: 27, salary: 'School credit (maybe)', outlook: 'Permanent position pending',
      };

      if (isGrinder && noPlan) return {
        title: 'Productivity YouTuber With Zero Productivity',
        prompt: 'A productivity creator in his twenties, white, neat side-parted hair and a crisp button-down, sitting at an immaculate minimalist desk with a camera on a boom arm pointed at him, using a steel ruler to align a single pen perfectly parallel to a closed notebook, a row of six identical pens already spaced evenly beside it. Soft window light and one desk lamp',
        caption: 'You spent 6 hours organizing your to-do list. The to-do list has one item: make to-do list.',
        happiness: 40, salary: 'Ad revenue: $1.23', outlook: 'Optimizing the optimization',
      };

      return null;
    },
    () => {
      // === TIER 3: Monday + Coworker combos (catch remaining) ===

      if (drinksCoffee && isReliable) return {
        title: 'Chief Coffee Officer and Meeting Survivor',
        prompt: 'An office worker in her fifties, Irish, auburn hair, reading glasses on a chain and a navy cardigan, walking out of one glass meeting room straight toward the next, carrying a cardboard tray of four coffees against her chest with a laptop clamped under one arm, eyes glazed with heroic fatigue. Colleagues sit in meetings behind every glass wall. Flat office daylight',
        caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
        happiness: 31, salary: 'Benefits include free coffee', outlook: 'One more meeting',
      };

      if (drinksCoffee && isVisionary) return {
        title: 'Caffeinated Prophet of the Next Big Thing',
        prompt: 'A wide-eyed visionary in his thirties, Ethiopian, in a rumpled shirt, standing in a dark office at night and gazing upward in ecstatic revelation, holding up beside his face a wobbling tower of seven stacked empty paper coffee cups. A single desk lamp lights him from below, the rest of the office in shadow',
        caption: 'After cup number seven, you see the future. Unfortunately, nobody else does.',
        happiness: 47, salary: 'Vision-based compensation', outlook: 'Buzzing',
      };

      if (drinksCoffee && isLoner) return {
        title: 'Solo Developer Running on Espresso and Spite',
        prompt: 'A solo developer in her forties, Polish, hair tied back, big noise-cancelling headphones on, sitting alone in a dim converted garage at a desk where a large chrome espresso machine stands right beside the keyboard, pulling a shot without looking away from her monitor, jaw set in grim determination. The monitor faces away from the camera and lights her face',
        caption: 'You do not need coworkers. You need a better coffee maker and faster internet.',
        happiness: 72, salary: 'Freelance feast-or-famine', outlook: 'Caffeinated independence',
      };

      if (drinksCoffee && isSnackGuy) return {
        title: 'Office Supply Chain Manager (Unofficial)',
        prompt: 'An office worker in his thirties, Egyptian, in a soft cardigan, standing in an office aisle holding a large wicker basket of fruit, nuts and biscuits at chest height like a flight attendant on a trolley run, calm and benevolent. Behind him a short queue of colleagues waits hopefully, mugs in hand. Soft office daylight',
        caption: 'You keep the team fed and caffeinated. Without you, productivity drops to zero.',
        happiness: 65, salary: 'Expensed meals', outlook: 'Catering budget approved',
      };

      if (suffers && isReliable) return {
        title: 'Senior Associate of Quiet Desperation',
        prompt: 'A senior associate in her forties, Korean American, in a cardigan and pearl earrings, sitting perfectly upright at a beige cubicle desk, holding a small slice of someone else\'s farewell cake on a paper plate and wearing a practised, hollow, polite smile. A drooping succulent sits beside her keyboard. Fluorescent panels overhead, colleagues chatting far away in the background',
        caption: 'You are the backbone of a company that does not know your last name.',
        happiness: 19, salary: 'Competitive (for 2008)', outlook: 'Stable',
      };

      if (suffers && isVisionary) return {
        title: 'Misunderstood Genius in the Wrong Department',
        prompt: 'A thoughtful man in his thirties, Native American, long dark hair tied back, in a button-down shirt, sitting in a cramped payroll department cubicle between grey filing cabinets, holding a thick closed leather notebook against his chest with both hands and gazing out of a rain-streaked window at the city with quiet longing. Grey rainy daylight',
        caption: 'Your ideas could change the company. Unfortunately, they are in a notebook nobody opens.',
        happiness: 22, salary: 'Undervalued', outlook: 'Transfer request pending',
      };

      if (suffers && isLoner) return {
        title: 'Remote Worker Who Forgot What Humans Look Like',
        prompt: 'A remote worker in his twenties, Thai, wearing a dress shirt over pyjama bottoms, sitting at a home desk in a dim room with blackout curtains drawn, holding up a small hand mirror at face height and studying his own reflection with mild, puzzled surprise. The laptop webcam beside him is covered with a strip of tape. A thin blade of daylight slips through a gap in the curtains',
        caption: 'You turned off your camera in 2020 and nobody has seen your face since.',
        happiness: 48, salary: 'Saved on pants budget', outlook: 'Camera permanently off',
      };

      if (suffers && isSnackGuy) return {
        title: 'Comfort Food Therapist (Self-Employed)',
        prompt: 'A serene office worker in her sixties, Dutch, with cropped silver hair and a warm cardigan, sitting in a leather armchair in a softly lit therapist\'s office, holding at chest height an immaculately organised compartment box of snacks sorted by colour and offering a single biscuit toward the empty patient couch with deep, calm compassion. One warm floor lamp and a window',
        caption: 'Your coping mechanism is delicious and your snack drawer has better organization than your life.',
        happiness: 55, salary: 'Snack budget: unlimited', outlook: 'Emotionally stable (when fed)',
      };

      if (sameEveryDay && isReliable) return {
        title: 'Senior Bureaucrat, Department of Doing Things Correctly',
        prompt: 'A civil servant in his sixties, Ghanaian, in an impeccable grey suit and tie, sitting at a perfectly ordered wooden desk with a rubber stamp raised mid-air at chest height above a single blank form, an exactly squared tower of identical blank forms beside him reaching his shoulder. Serene, precise expression. Institutional fluorescent light and a tall office window',
        caption: 'You have processed 10,000 forms without a single error. Nobody has thanked you once.',
        happiness: 35, salary: 'Government grade (with pension)', outlook: 'Predictably stable',
      };

      if (sameEveryDay && isVisionary) return {
        title: 'Philosopher Who Accidentally Ended Up in Corporate',
        prompt: 'A corporate analyst in her thirties, Greek, dark curly hair, in a blazer, sitting at an open-plan office desk in the exact pose of Rodin\'s Thinker, chin resting on her fist, contemplating a single paperclip held up in her other hand with profound existential resignation. Her laptop sits closed and untouched. Grey window light across a quiet office',
        caption: 'You ponder the meaning of work while doing meaningless work. The irony sustains you.',
        happiness: 43, salary: 'Existentially adequate', outlook: 'Contemplating',
      };

      if (sameEveryDay && isLoner) return {
        title: 'Night Shift Security Guard / Aspiring Novelist',
        prompt: 'A night security guard in his sixties, a Finnish man with a white beard and reading glasses, in a navy guard uniform, sitting at the reception desk of a vast empty glass lobby at three in the morning, typing on a vintage typewriter in total peace, a tall stack of typed pages face down beside him. A desk lamp lights him and the dark city glimmers softly through the glass behind',
        caption: 'You guard an empty building and write a novel nobody will read. Both bring you peace.',
        happiness: 61, salary: 'Night differential', outlook: 'Chapter 47 in progress',
      };

      if (sameEveryDay && isSnackGuy) return {
        title: 'Professional Taste Tester (Self-Appointed)',
        prompt: 'A self-appointed taste tester in her forties, Peruvian, in a neat office blouse, standing in a corporate break room in front of a vending machine, holding a single plain foil packet of crisps up to the light and inspecting it through a jeweller\'s loupe with grave professional seriousness. Two colleagues watch from the doorway at a safe distance. Fluorescent break-room light',
        caption: 'You have reviewed every item in the vending machine. B7 is your magnum opus.',
        happiness: 68, salary: 'Vending machine budget', outlook: 'Flavor matrix expanding',
      };

      if (isSnackGuy) return {
        title: 'Senior Falafel Architect, Tel Aviv District',
        prompt: 'A falafel architect in his forties, Israeli, in a white shirt with rolled sleeves and an architect\'s white hard hat, at a small Tel Aviv street food counter, checking a tall, precisely stacked tower of falafel balls with a spirit level, hummus spread between the layers like mortar, deadly serious. Soft Mediterranean daylight on the pale stone street behind him',
        caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
        happiness: 88, salary: 'All the falafel you can eat', outlook: 'Structurally sound',
      };

      if (isLoner) return {
        title: 'Remote Work Pioneer and Professional Hermit',
        prompt: 'A remote worker in her fifties, Mexican, grey-streaked braid, in a comfortable cardigan, sitting contentedly at a desk in a cosy plant-filled home office, facing a large grey cat that sits upright on the desk like a manager in a one-to-one meeting. The two regard each other with total seriousness. Blackout curtains mostly drawn, one warm desk lamp',
        caption: 'Your commute is 12 steps and your coworker is a cat who judges you silently.',
        happiness: 94, salary: 'Enough for fiber internet', outlook: 'Do not disturb',
      };

      if (isVisionary) return {
        title: 'Thought Leader Without the Thought',
        prompt: 'A thought leader in his thirties, white, in a black t-shirt under a blazer with a headset microphone, standing on a round red carpet on a conference stage, arms spread wide in a grand visionary gesture in front of a giant projection screen that is completely blank white. In the dim front row a single audience member is asleep. One spotlight on the speaker',
        caption: 'You have vision. You have passion. You have no actionable plan whatsoever.',
        happiness: 46, salary: 'Speaking fees (waived)', outlook: 'Disruption imminent',
      };

      if (lovesMon) return {
        title: 'Corporate Optimism Evangelist',
        prompt: 'A relentlessly cheerful office worker in her twenties, Ukrainian, in a bright yellow cardigan, beaming in a corporate break room on a grey Monday morning and holding out a tray of homemade muffins at chest height. Behind her two colleagues are quietly slipping out through the break-room door. Flat fluorescent light and a rainy window',
        caption: 'Your relentless positivity is both your superpower and why people avoid the break room.',
        happiness: 52, salary: 'Rewarded with enthusiasm', outlook: 'Concerningly positive',
      };
      return null;
    },
  ];

  const fallback = {
    title: 'Professional Human Being (Specialization Pending)',
    prompt: 'A person in their thirties of mixed heritage, with a cropped haircut, in business casual, standing at a rural crossroads on a wide flat plain, holding a paper map upside down at chest height with a calm, unbothered expression. Beside them a weathered wooden signpost at head height points four blank arms in four different directions. Flat overcast light and a pale sky',
    caption: 'You defy every algorithm, every matrix, and every career quiz. HR has given up classifying you.',
    happiness: 50, salary: 'Negotiable (probably not)', outlook: 'Beautifully undefined',
  };

  const proposals = tiers.map((tier) => tier()).filter(Boolean);
  if (proposals.length === 0) return fallback;
  return proposals[answersHash([s, m, c, g, f]) % proposals.length];
}

// FNV-1a over the joined answers. Deterministic across processes and Node
// versions, which matters because the same answers must always produce the
// same career (and therefore the same cached portrait).
function answersHash(parts) {
  let h = 0x811c9dc5;
  for (const ch of parts.join('\u0000')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Answer sets that land on the careers shown on the landing page. Each one is
// asserted in __tests__/careers.test.js to map to the title listed beside it,
// so editing mapCareer can't silently swap the samples.
const SAMPLE_ANSWERS = [
  ['Founder Waiting for Series A That Will Never Come', ['Strategic thinking', 'IV drip of coffee', 'The reliable one', 'CEO or bust', 'Tech & Startups']],
  ['JIRA Ticket Archaeologist, Legacy Systems Division', ['Strategic thinking', 'IV drip of coffee', 'Wait, you have coworkers?', 'To still be employed', 'Tech & Startups']],
  ['Senior Associate of Quiet Desperation', ['Strategic thinking', 'Quiet suffering', 'The reliable one', 'CEO or bust', 'Finance & Business']],
  ['Senior Falafel Architect, Tel Aviv District', ['Strategic thinking', 'I genuinely love Mondays (liar)', 'The one who orders food', 'CEO or bust', 'Tech & Startups']],
  ['Solo Developer Running on Espresso and Spite', ['Strategic thinking', 'IV drip of coffee', 'Wait, you have coworkers?', 'CEO or bust', 'Creative Arts & Media']],
  ['Remote DevOps Engineer Who Blames the Wi-Fi', ['Strategic thinking', 'IV drip of coffee', 'The reliable one', 'Laptop from a beach', 'Tech & Startups']],
  ['Thought Leader Without the Thought', ['Strategic thinking', 'I genuinely love Mondays (liar)', 'A visionary (probably)', 'CEO or bust', 'I just want to go viral']],
  ['Night Shift Security Guard / Aspiring Novelist', ['Strategic thinking', 'Every day feels the same', 'Wait, you have coworkers?', 'CEO or bust', 'Tech & Startups']],
];

function sampleCareers() {
  return SAMPLE_ANSWERS.map(([, answers]) => mapCareer(...answers));
}

module.exports = { mapCareer, SAMPLE_ANSWERS, sampleCareers };

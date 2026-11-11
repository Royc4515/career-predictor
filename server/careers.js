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
const { QUESTION_IDS, DEFAULT_PORTRAIT, optionText, portraitIdFor, resolveAnswers } = require('./quiz');

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
    subject: 'man',
    prompt:
      'A startup founder in his late twenties, a South Asian man in a grey zip hoodie, standing alone in a coworking space after hours, holding his phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside his shoulder. Rows of empty desks behind him fade into darkness, one desk lamp the only light',
    altPrompt:
      'A startup founder in her late twenties, a Mexican woman with a high ponytail, in a grey zip hoodie, standing alone in a coworking space after hours, holding her phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside her shoulder. Rows of empty desks behind her fade into darkness, one desk lamp the only light',
    personalScene:
      'standing alone in a coworking space after hours in a grey zip hoodie, holding a phone face-up in both hands at chest height and staring at it, waiting for a call that is not coming. A half-deflated silver party balloon droops on a ribbon beside their shoulder. Rows of empty desks fade into darkness behind them, one desk lamp the only light',
  },
  {
    title: 'Remote DevOps Engineer Who Blames the Wi-Fi',
    field: 'tech',
    cues: ['asked', 'palms'],
    caption: 'Your deploy pipeline breaks every time a cloud passes over your beach umbrella.',
    happiness: 71,
    salary: 'Contractor rates minus paradise tax',
    outlook: 'Connection unstable',
    subject: 'woman',
    prompt:
      'A DevOps engineer in her thirties, a Black woman with short natural hair, in a loose linen shirt, standing barefoot on a bright tropical beach holding her open laptop out at arm\'s length at shoulder height, tilting it toward the sky in search of a signal, eyes narrowed with weary suspicion. One small grey cloud hangs directly over her and casts the only shadow on the whole sunny beach, right on her',
    altPrompt:
      'A DevOps engineer in his thirties, a Croatian man with a shaved head and stubble, in a loose linen shirt, standing barefoot on a bright tropical beach holding his open laptop out at arm\'s length at shoulder height, tilting it toward the sky in search of a signal, eyes narrowed with weary suspicion. One small grey cloud hangs directly over him and casts the only shadow on the whole sunny beach, right on him',
    personalScene:
      'in a loose linen shirt, standing barefoot on a bright tropical beach, holding an open laptop out at shoulder height and tilting it toward the sky in search of a signal, eyes narrowed with weary suspicion. One small grey cloud hangs directly over them and casts the only shadow on the whole sunny beach, right on them',
  },
  {
    title: 'JIRA Ticket Archaeologist, Legacy Systems Division',
    field: 'tech',
    cues: ['grind', 'desk'],
    caption: 'You maintain code from 2007 that nobody understands, including the person who wrote it. Especially the person who wrote it.',
    happiness: 34,
    salary: 'Stable but soul-crushing',
    outlook: 'COBOL never dies',
    subject: 'man',
    prompt:
      'A legacy systems engineer in his late fifties, a white man with a grey ponytail, wire-rimmed glasses and a head torch, standing in a dim server room beside a dusty beige 1990s computer tower that sits on a tall steel cart at chest height, right beside his face, gently sweeping dust from it with a soft archaeologist\'s brush as if uncovering a fossil, deeply reverent. Rows of server racks recede behind him, lit by one flickering fluorescent tube',
    altPrompt:
      'A legacy systems engineer in her late fifties, a Chilean woman with a long grey braid, wire-rimmed glasses and a head torch, standing in a dim server room beside a dusty beige 1990s computer tower that sits on a tall steel cart at chest height, right beside her face, gently sweeping dust from it with a soft archaeologist\'s brush as if uncovering a fossil, deeply reverent. Rows of server racks recede behind her, lit by one flickering fluorescent tube',
    personalScene:
      'wearing a head torch and a grey work shirt in a dim server room, gently sweeping dust with a soft archaeologist\'s brush from a beige 1990s computer tower that sits on a tall steel cart at chest height beside their face, as if uncovering a fossil, deeply reverent. Rows of server racks recede behind them, lit by one flickering fluorescent tube',
  },
  {
    title: 'Open Source Contributor (0 Stars, 0 Forks)',
    field: 'tech',
    cues: ['ghost', 'thursday'],
    caption: 'You built it. Nobody came. You keep building anyway because the code is the point.',
    happiness: 58,
    salary: 'GitHub sponsorship: $0/mo',
    outlook: 'Waiting for Hacker News',
    subject: 'woman',
    prompt:
      'A young programmer in her early twenties, a Latina woman in a plain grey t-shirt with headphones around her neck, standing proudly in an empty community hall, holding her open laptop up at chest height like a science fair project, its screen turned away from the camera. A full bowl of untouched free sweets sits on a tall stand beside her shoulder; rows of empty folding chairs fill the hall behind her. Light from high windows',
    altPrompt:
      'A young programmer in his early twenties, an Irish man with red curls, in a plain grey t-shirt with headphones around his neck, standing proudly in an empty community hall, holding his open laptop up at chest height like a science fair project, its screen turned away from the camera. A full bowl of untouched free sweets sits on a tall stand beside his shoulder; rows of empty folding chairs fill the hall behind him. Light from high windows',
    personalScene:
      'in a plain grey t-shirt with headphones around their neck, standing proudly in an empty community hall, holding an open laptop up at chest height like a science fair project, its screen turned away from the camera. A full bowl of untouched free sweets sits on a tall stand beside their shoulder, and rows of empty folding chairs fill the hall behind them. Light from high windows',
  },
  {
    title: 'Solo Developer Running on Espresso and Spite',
    field: 'tech',
    cues: ['coffee', 'ghost'],
    caption: 'You do not need coworkers. You need a better coffee maker and faster internet.',
    happiness: 72,
    salary: 'Freelance feast-or-famine',
    outlook: 'Caffeinated independence',
    subject: 'woman',
    prompt:
      'A solo developer in her forties, a Polish woman with her hair tied back and big noise-cancelling headphones on, sitting alone in a dim converted garage at a desk where a large chrome espresso machine stands on a raised shelf right beside her face, pulling a shot without looking away from her monitor, jaw set in grim determination. The monitor faces away from the camera and lights her face',
    altPrompt:
      'A solo developer in his forties, a Jamaican man with short locs tied back and big noise-cancelling headphones on, sitting alone in a dim converted garage at a desk where a large chrome espresso machine stands on a raised shelf right beside his face, pulling a shot without looking away from his monitor, jaw set in grim determination. The monitor faces away from the camera and lights his face',
    personalScene:
      'in big noise-cancelling headphones, sitting alone in a dim converted garage at a desk where a large chrome espresso machine stands on a raised shelf right beside their face, pulling a shot without looking away from the monitor, jaw set in grim determination. The monitor faces away from the camera and is the only light on their face',
  },
  {
    title: 'UX Designer for an App That Will Be Deprecated',
    field: 'tech',
    cues: ['improv', 'suffer'],
    caption: 'You will craft pixel-perfect interfaces for products that pivot before launch day.',
    happiness: 45,
    salary: 'Paid in stakeholder feedback',
    outlook: 'Figma will fix it',
    subject: 'man',
    prompt:
      'A UX designer in his thirties, a Lebanese man with a neat beard and an oatmeal sweater, standing in a glass meeting room with a brave, optimistic smile, holding a white paper phone prototype up beside his face, about to lower it into the cardboard archive box he cradles at chest height, already full of earlier paper prototypes. Behind him the meeting room is being cleared out, chairs stacked upside down on the table. Flat overcast daylight through the glass',
    altPrompt:
      'A UX designer in her thirties, a Danish woman with a blunt fringe and an oatmeal sweater, standing in a glass meeting room with a brave, optimistic smile, holding a white paper phone prototype up beside her face, about to lower it into the cardboard archive box she cradles at chest height, already full of earlier paper prototypes. Behind her the meeting room is being cleared out, chairs stacked upside down on the table. Flat overcast daylight through the glass',
    personalScene:
      'in an oatmeal sweater, standing in a glass meeting room with a brave, optimistic smile, holding a white paper phone prototype up beside their face, about to lower it into a cardboard archive box cradled at chest height, already full of earlier paper prototypes. Behind them the room is being cleared out, chairs stacked upside down on the table. Flat overcast daylight through the glass',
  },
  {
    title: 'Chief Executive of a Declining Startup',
    field: 'tech',
    cues: ['hype', 'bell'],
    caption: 'You will lead with vision, charisma, and a burn rate that would make investors weep.',
    happiness: 12,
    salary: 'Equity in a company worth $0',
    outlook: 'Pivoting aggressively',
    subject: 'woman',
    prompt:
      'A startup chief executive in her late thirties, a Japanese woman with a sharp black bob and a tailored charcoal suit, standing with hands on hips and unshakable confidence in the middle of a large open-plan office that has been almost entirely cleared out, bare desks and stacked chairs behind her, a tall wilting fiddle-leaf fig drooping beside her shoulder. Late afternoon sun through venetian blinds throws stripes across the room',
    altPrompt:
      'A startup chief executive in his late thirties, an Egyptian man with slicked-back hair and a tailored charcoal suit, standing with hands on hips and unshakable confidence in the middle of a large open-plan office that has been almost entirely cleared out, bare desks and stacked chairs behind him, a tall wilting fiddle-leaf fig drooping beside his shoulder. Late afternoon sun through venetian blinds throws stripes across the room',
    personalScene:
      'in a tailored charcoal suit, standing with hands on hips and unshakable confidence in the middle of a large open-plan office that has been almost entirely cleared out, bare desks and stacked chairs behind them, a tall wilting fiddle-leaf fig drooping right beside their shoulder. Hard afternoon daylight through venetian blinds throws stripes across the room',
  },
  {
    title: 'Remote Worker Who Forgot What Humans Look Like',
    field: 'tech',
    cues: ['same', 'palms'],
    caption: 'You turned off your camera in 2020 and nobody has seen your face since.',
    happiness: 48,
    salary: 'Saved on pants budget',
    outlook: 'Camera permanently off',
    subject: 'man',
    prompt:
      'A remote worker in his twenties, a Thai man wearing a dress shirt over pyjama bottoms, sitting at a home desk in a dim room with blackout curtains drawn, holding up a small hand mirror at face height and studying his own reflection with mild, puzzled surprise. The laptop webcam beside him is covered with a strip of tape. A thin blade of daylight slips through a gap in the curtains',
    altPrompt:
      'A remote worker in her twenties, a Moroccan woman wearing a dress shirt over pyjama bottoms, sitting at a home desk in a dim room with blackout curtains drawn, holding up a small hand mirror at face height and studying her own reflection with mild, puzzled surprise. The laptop webcam beside her is covered with a strip of tape. A thin blade of daylight slips through a gap in the curtains',
    personalScene:
      'wearing a dress shirt over pyjama bottoms, sitting at a home desk in a dim room with blackout curtains drawn, holding up a small hand mirror at shoulder height beside their face and studying their own reflection with mild, puzzled surprise. The laptop webcam beside them is covered with a strip of tape. A thin blade of daylight slips through a gap in the curtains',
  },
  {
    title: 'Caffeinated Prophet of the Next Big Thing',
    field: 'tech',
    cues: ['coffee', 'translator'],
    caption: 'After cup number seven, you see the future. Unfortunately, nobody else does.',
    happiness: 47,
    salary: 'Vision-based compensation',
    outlook: 'Buzzing',
    subject: 'man',
    prompt:
      'A wide-eyed visionary in his thirties, an Ethiopian man in a rumpled shirt, standing in a dark office at night and gazing upward in ecstatic revelation, holding up beside his face a wobbling tower of seven stacked empty paper coffee cups. A single desk lamp lights him from below, the rest of the office in shadow',
    altPrompt:
      'A wide-eyed visionary in her thirties, a Ukrainian woman in a rumpled shirt, standing in a dark office at night and gazing upward in ecstatic revelation, holding up beside her face a wobbling tower of seven stacked empty paper coffee cups. A single desk lamp lights her from below, the rest of the office in shadow',
    personalScene:
      'in a rumpled shirt, standing in a dark office at night and gazing upward in ecstatic revelation, holding at shoulder height a wobbling tower of seven stacked empty paper coffee cups that rises right beside their face. A single desk lamp lights them from below, the rest of the office in shadow',
  },
  {
    title: 'Prompt Engineer Who Says Please to the Chatbot',
    field: 'tech',
    cues: ['network', 'asked'],
    caption: 'You write three paragraphs of polite context and end every request with thank you. Just in case.',
    happiness: 64,
    salary: 'Paid per token (yours)',
    outlook: 'Staying on its good side',
    subject: 'man',
    prompt:
      'A prompt engineer in his late twenties, a Kenyan man in a soft grey hoodie, sitting very upright at a tidy desk at night and typing on a laptop raised on a tall stand to chest height, its screen facing away from the camera, one hand pressed to his chest in sincere politeness, leaning toward the screen as if apologising to it. A single desk lamp lights him; a small houseplant sits beside the laptop',
    altPrompt:
      'A prompt engineer in her late twenties, a Norwegian woman with a blonde braid, in a soft grey hoodie, sitting very upright at a tidy desk at night and typing on a laptop raised on a tall stand to chest height, its screen facing away from the camera, one hand pressed to her chest in sincere politeness, leaning toward the screen as if apologising to it. A single desk lamp lights her; a small houseplant sits beside the laptop',
    personalScene:
      'in a soft grey hoodie, sitting very upright at a tidy desk at night before a laptop raised on a tall stand to chest height, its screen facing away from the camera, pausing mid-typing with one hand pressed to their chest in sincere politeness, leaning toward the screen as if apologising to it. A single desk lamp lights them, a small houseplant beside the laptop',
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
    subject: 'man',
    prompt:
      'A creative director in his forties, a white man with a shaved head, black turtleneck and round tortoiseshell glasses, standing with arms crossed and total confidence beside a tall easel in a bare white agency studio. The easel holds one big canvas at head height, right beside his face, completely blank except for a single small beige dot in the centre, presented as the entire strategy. Soft daylight from a tall window',
    altPrompt:
      'A creative director in her forties, a Brazilian woman with a sleek platinum crop, black turtleneck and round tortoiseshell glasses, standing with arms crossed and total confidence beside a tall easel in a bare white agency studio. The easel holds one big canvas at head height, right beside her face, completely blank except for a single small beige dot in the centre, presented as the entire strategy. Soft daylight from a tall window',
    personalScene:
      'in a black turtleneck, standing with arms crossed and total confidence beside a tall easel in a bare white agency studio. The easel holds one big canvas at head height, right beside their face, completely blank except for a single small beige dot in the centre, presented as the entire strategy. Soft daylight from a tall window',
  },
  {
    title: 'Travel Photographer Whose Parents Ask When They\'ll Get a Real Job',
    field: 'creative',
    cues: ['improv', 'palms'],
    caption: 'Every sunset is content. Every family dinner is a pitch meeting you did not ask for.',
    happiness: 76,
    salary: '$0.003 per download',
    outlook: 'Golden hour forever',
    subject: 'woman',
    prompt:
      'A travel photographer in her late twenties, a Filipina woman with wind-tangled hair and a rain jacket, a professional camera hanging forgotten from her neck, standing on a grassy sea cliff holding her phone to her ear with the patient, tight-lipped smile of someone hearing her mother ask about a real job for the hundredth time. Behind her a spectacular sunset over the ocean goes completely ignored. Soft dusk light',
    altPrompt:
      'A travel photographer in his late twenties, a Sri Lankan man with wind-tangled hair and a rain jacket, a professional camera hanging forgotten from his neck, standing on a grassy sea cliff holding his phone to his ear with the patient, tight-lipped smile of someone hearing his mother ask about a real job for the hundredth time. Behind him a spectacular sunset over the ocean goes completely ignored. Soft dusk light',
    personalScene:
      'in a rain jacket with a professional camera hanging forgotten at their chest, standing on a grassy sea cliff holding a phone to their ear with the patient, tight-lipped smile of someone hearing an older relative ask about a real job for the hundredth time. Behind them a spectacular rugged coastline and rolling sea go completely ignored. Soft overcast evening light',
  },
  {
    title: 'Freelance Idea Generator (Execution Not Included)',
    field: 'creative',
    cues: ['translator', 'thursday'],
    caption: 'You have 47 unfinished projects and one lightning bolt of genius that you swear is coming.',
    happiness: 74,
    salary: 'Revenue model TBD',
    outlook: 'Lots of irons in the fire',
    subject: 'woman',
    prompt:
      'A freelance creative in her fifties, a Black woman with silver locs and a mustard cardigan, standing in a cluttered home studio holding an unlit light bulb up at shoulder height with both hands like a trophy, beaming with absolute certainty. On the long shelf behind her, softly out of focus, sit dozens of abandoned projects: a half-knitted scarf, half-painted canvases, a half-built birdhouse. Afternoon window light',
    altPrompt:
      'A freelance creative in his fifties, a Portuguese man with a salt-and-pepper beard and a mustard cardigan, standing in a cluttered home studio holding an unlit light bulb up at shoulder height with both hands like a trophy, beaming with absolute certainty. On the long shelf behind him, softly out of focus, sit dozens of abandoned projects: a half-knitted scarf, half-painted canvases, a half-built birdhouse. Afternoon window light',
    personalScene:
      'in a mustard cardigan, standing in a cluttered home studio holding an unlit light bulb up at shoulder height with both hands like a trophy, beaming with absolute certainty. On the long shelf behind them, softly out of focus, sit dozens of abandoned projects: a half-knitted scarf, half-painted canvases, a half-built birdhouse. Afternoon window light',
  },
  {
    title: 'Graphic Designer Who Dies Inside at Every "Make the Logo Bigger"',
    field: 'creative',
    cues: ['coffee', 'asked'],
    caption: 'Your portfolio is exquisite. Your clients are not. The logo will always need to be bigger.',
    happiness: 29,
    salary: 'Per revision (infinite revisions)',
    outlook: 'One more round of feedback',
    subject: 'woman',
    prompt:
      'A graphic designer in her twenties, a Vietnamese woman with a black bob and an oversized white shirt, standing in a client\'s office holding up a large white foam board almost entirely filled by one enormous black circle, her expression one of quiet inner devastation. Beside her a client in a suit holds his hands even wider apart, asking for it bigger still. Even overhead office light',
    altPrompt:
      'A graphic designer in his twenties, a Hungarian man with a buzz cut and an oversized white shirt, standing in a client\'s office holding up a large white foam board almost entirely filled by one enormous black circle, his expression one of quiet inner devastation. Beside him a client in a suit holds both hands even wider apart, asking for it bigger still. Even overhead office light',
    personalScene:
      'in an oversized white shirt, standing in a client\'s office holding up at chest height a large white foam board almost entirely filled by one enormous black circle, its edge right beside their face, wearing an expression of quiet inner devastation. Beside them a client in a grey suit holds both hands even wider apart, asking for it bigger still. Even overhead office light',
  },
  {
    title: 'Night Shift Security Guard / Aspiring Novelist',
    field: 'creative',
    cues: ['same', 'ghost'],
    caption: 'You guard an empty building and write a novel nobody will read. Both bring you peace.',
    happiness: 61,
    salary: 'Night differential',
    outlook: 'Chapter 47 in progress',
    subject: 'man',
    prompt:
      'A night security guard in his sixties, a Finnish man with a white beard and reading glasses, in a navy guard uniform, sitting at the reception desk of a vast empty glass lobby at three in the morning, typing on a vintage typewriter in total peace, a tall stack of typed pages face down beside him. A desk lamp lights him and the dark city glimmers softly through the glass behind',
    altPrompt:
      'A night security guard in her sixties, a Scottish woman with a white braid and reading glasses, in a navy guard uniform, sitting at the reception desk of a vast empty glass lobby at three in the morning, typing on a vintage typewriter in total peace, a tall stack of typed pages face down beside her. A desk lamp lights her and the dark city glimmers softly through the glass behind',
    personalScene:
      'in a navy security guard uniform, sitting at the reception desk of a vast empty glass lobby at three in the morning, typing in total peace on a vintage typewriter raised on a stack of binders to chest height, a tall stack of typed pages face down beside their shoulder. A desk lamp lights them and the dark city glimmers softly through the glass behind',
  },
  {
    title: 'Misunderstood Genius in the Wrong Department',
    field: 'creative',
    cues: ['vision', 'desk'],
    caption: 'Your ideas could change the company. Unfortunately, they are in a notebook nobody opens.',
    happiness: 22,
    salary: 'Undervalued',
    outlook: 'Transfer request pending',
    subject: 'man',
    prompt:
      'A thoughtful man in his thirties, Native American, long dark hair tied back, in a button-down shirt, sitting in a cramped payroll department cubicle between grey filing cabinets, holding a thick closed leather notebook against his chest with both hands and gazing out of a rain-streaked window at the city with quiet longing. Grey rainy daylight',
    altPrompt:
      'A thoughtful woman in her thirties, Iranian, dark hair in a low bun, in a button-down shirt, sitting in a cramped payroll department cubicle between grey filing cabinets, holding a thick closed leather notebook against her chest with both hands and gazing out of a rain-streaked window at the city with quiet longing. Grey rainy daylight',
    personalScene:
      'in a button-down shirt, sitting in a cramped payroll department cubicle between grey filing cabinets, holding a thick closed leather notebook against their chest with both hands and gazing out of a rain-streaked window at the city with quiet longing, as if the notebook held a better company. Grey rainy daylight',
  },
  {
    title: 'Philosopher Who Accidentally Ended Up in Corporate',
    field: 'creative',
    cues: ['suffer', 'thursday'],
    caption: 'You ponder the meaning of work while doing meaningless work. The irony sustains you.',
    happiness: 43,
    salary: 'Existentially adequate',
    outlook: 'Contemplating',
    subject: 'woman',
    prompt:
      'A corporate analyst in her thirties, a Greek woman with dark curly hair, in a blazer, sitting at an open-plan office desk in the exact pose of Rodin\'s Thinker, chin resting on her fist, contemplating a single paperclip held up beside her face in her other hand with profound existential resignation. Her laptop sits closed and untouched. Grey window light across a quiet office',
    altPrompt:
      'A corporate analyst in his thirties, a Senegalese man with close-cropped hair, in a blazer, sitting at an open-plan office desk in the exact pose of Rodin\'s Thinker, chin resting on his fist, contemplating a single paperclip held up beside his face in his other hand with profound existential resignation. His laptop sits closed and untouched. Grey window light across a quiet office',
    personalScene:
      'in a blazer, sitting at an open-plan office desk in the exact pose of Rodin\'s Thinker, chin resting on one fist, contemplating a single paperclip held up beside their face in the other hand with profound existential resignation. The laptop on the desk sits closed and untouched. Grey window light across a quiet office',
  },
  {
    title: 'Senior Falafel Architect, Tel Aviv District',
    field: 'creative',
    cues: ['grind', 'lunch'],
    caption: 'Your structures are delicious and your load-bearing hummus is award-winning.',
    happiness: 88,
    salary: 'All the falafel you can eat',
    outlook: 'Structurally sound',
    subject: 'man',
    prompt:
      'A falafel architect in his forties, an Israeli man in a white shirt with rolled sleeves and an architect\'s white hard hat, standing at a Tel Aviv street food counter beside a tall, precisely stacked tower of falafel balls that rises from the counter to his eye level, hummus spread between the layers like mortar, holding a spirit level against it beside his face, deadly serious. Soft Mediterranean daylight on the pale stone street behind him',
    altPrompt:
      'A falafel architect in her forties, a freckled woman with cropped grey hair, in a white shirt with rolled sleeves and an architect\'s white hard hat, standing at a Tel Aviv street food counter beside a tall, precisely stacked tower of falafel balls that rises from the counter to her eye level, hummus spread between the layers like mortar, holding a spirit level against it beside her face, deadly serious. Soft Mediterranean daylight on the pale stone street behind her',
    personalScene:
      'in a white architect\'s hard hat and a white shirt with rolled sleeves at a Tel Aviv street food counter, holding a spirit level against a precisely stacked tower of falafel balls that rises from the counter to shoulder height beside their face, hummus spread between the layers like mortar, deadly serious and proud. Soft Mediterranean daylight on the pale stone street behind them',
  },
  {
    title: 'Eternal Intern, Distinguished Fellow',
    field: 'creative',
    cues: ['hype', 'desk'],
    caption: 'Three years in and they still have not learned your name. But you persist.',
    happiness: 27,
    salary: 'School credit (maybe)',
    outlook: 'Permanent position pending',
    subject: 'woman',
    prompt:
      'An eager intern in her early twenties, an Indonesian woman in a neat blouse, standing bolt upright in a busy office corridor holding a cardboard tray of six coffees at chest height with a hopeful smile, while full-time employees stream past her on both sides without a glance. Bright, even office light through glass partitions',
    altPrompt:
      'An eager intern in his early twenties, a Lithuanian man in a neat shirt and tie, standing bolt upright in a busy office corridor holding a cardboard tray of six coffees at chest height with a hopeful smile, while full-time employees stream past him on both sides without a glance. Bright, even office light through glass partitions',
    personalScene:
      'in a neatly pressed shirt, standing bolt upright in a busy office corridor holding a cardboard tray of six coffees at chest height with a hopeful smile, while full-time employees stream past on both sides without a glance, as if they were invisible. Bright, even office light through glass partitions',
  },
  {
    title: 'Screenwriter Who Has Been on Page 30 Since 2021',
    field: 'creative',
    cues: ['network', 'ghost'],
    caption: 'Act one is flawless. It has been flawless for five years. Act two is a rumour.',
    happiness: 57,
    salary: 'Option fee (theoretical)',
    outlook: 'Rewriting page 30',
    subject: 'woman',
    prompt:
      'A screenwriter in her forties, an Argentinian woman with a loose bun and reading glasses pushed up into her hair, sitting in a small cafe corner behind an open laptop turned away from the camera, holding a squared stack of thirty blank pages upright against her chest and staring into the middle distance with a pen between her teeth. A cold, untouched cappuccino sits beside the laptop. Soft window light and one pendant lamp',
    altPrompt:
      'A screenwriter in his forties, an Indian man with a loose topknot and reading glasses pushed up into his hair, sitting in a small cafe corner behind an open laptop turned away from the camera, holding a squared stack of thirty blank pages upright against his chest and staring into the middle distance with a pen between his teeth. A cold, untouched cappuccino sits beside the laptop. Soft window light and one pendant lamp',
    personalScene:
      'in a soft knit sweater, sitting in a small cafe corner behind an open laptop turned away from the camera, holding a squared stack of thirty blank pages upright against their chest and staring into the middle distance with a pen between their teeth. A cold, untouched cappuccino sits beside the laptop. Soft window light and one pendant lamp',
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
    subject: 'woman',
    prompt:
      'A crypto hedge fund manager in her late twenties, a Turkish woman with a sleek dark ponytail and a sharp navy power suit, seated at a wobbly folding card table in a tiny rented kitchen, posing like a billionaire for a power portrait with chin raised, one hand presenting a small glass jar held up at shoulder height beside her face, a few crumpled banknotes and coins inside, the whole fund. One bare ceiling bulb',
    altPrompt:
      'A crypto hedge fund manager in his late twenties, a Filipino man with slicked-back hair and a sharp navy power suit, seated at a wobbly folding card table in a tiny rented kitchen, posing like a billionaire for a power portrait with chin raised, one hand presenting a small glass jar held up at shoulder height beside his face, a few crumpled banknotes and coins inside, the whole fund. One bare ceiling bulb',
    personalScene:
      'in a sharp navy power suit, seated at a wobbly folding card table in a tiny rented kitchen, posing like a billionaire for a power portrait with chin raised, one hand presenting a small glass jar held up at shoulder height beside their face, a few crumpled banknotes and coins inside, the whole fund. One bare ceiling bulb',
  },
  {
    title: 'Offshore Tax Consultant (Legally Speaking)',
    field: 'finance',
    cues: ['network', 'palms'],
    caption: 'You optimize other people\'s money from a place where your own money is optimized.',
    happiness: 69,
    salary: 'Tax-efficient',
    outlook: 'Cayman Islands adjacent',
    subject: 'woman',
    prompt:
      'An offshore tax consultant in her sixties, a white woman with a silver bob and a cream linen suit, sitting perfectly composed at a polished wooden office desk that stands in the shallow surf of an empty white sand beach, holding a cup of tea on its saucer at chest height, a closed leather briefcase on the desk. Gentle waves lap around the desk, the open sea behind her with the horizon at shoulder height. Bright, hazy tropical daylight',
    altPrompt:
      'An offshore tax consultant in his sixties, a Japanese man with neat silver hair and a cream linen suit, sitting perfectly composed at a polished wooden office desk that stands in the shallow surf of an empty white sand beach, holding a cup of tea on its saucer at chest height, a closed leather briefcase on the desk. Gentle waves lap around the desk, the open sea behind him with the horizon at shoulder height. Bright, hazy tropical daylight',
    personalScene:
      'in a cream linen suit, sitting perfectly composed at a polished wooden office desk that stands in the shallow surf of an empty white sand beach, holding a cup of tea on its saucer at chest height, a closed leather briefcase on the desk. Gentle waves lap around the desk legs, the open sea behind them with the horizon at shoulder height. Bright, hazy tropical daylight',
  },
  {
    title: 'Junior Analyst Who Ages 10 Years Per Quarter',
    field: 'finance',
    cues: ['coffee', 'asked'],
    caption: 'Your pivot tables are immaculate. Your will to live is less so.',
    happiness: 15,
    salary: 'Golden handcuffs',
    outlook: 'Bonus season pending',
    subject: 'man',
    prompt:
      'A junior finance analyst aged twenty-three, a Korean man already showing streaks of premature grey at his temples, loosened tie and rolled shirtsleeves, sitting at his desk at two in the morning, clutching a large paper coffee cup in both hands at chest height and staring straight ahead with hollow eyes. The open-plan office behind him is dark and empty. Lit by the cold light of his monitor and one fluorescent panel',
    altPrompt:
      'A junior finance analyst aged twenty-three, a Colombian woman already showing streaks of premature grey at her temples, loosened tie and rolled shirtsleeves, sitting at her desk at two in the morning, clutching a large paper coffee cup in both hands at chest height and staring straight ahead with hollow eyes. The open-plan office behind her is dark and empty. Lit by the cold light of her monitor and one fluorescent panel',
    personalScene:
      'in a rumpled white shirt with rolled sleeves, sitting at a desk at two in the morning, clutching a large paper coffee cup in both hands at chest height and staring straight ahead with hollow, sleepless eyes. On the desk shelf beside their shoulder a small potted plant has withered to a dry brown stalk. The open-plan office behind them is dark and empty, lit by one cold fluorescent panel',
  },
  {
    title: 'Day Trader Who Calls It "Research"',
    field: 'finance',
    cues: ['same', 'thursday'],
    caption: 'Your watchlist has 200 tickers. Your portfolio has 3. Your mother is concerned.',
    happiness: 44,
    salary: 'Unrealized gains',
    outlook: 'Diamond hands',
    subject: 'man',
    prompt:
      'A day trader in his forties, a Black man in reading glasses, wearing a terry bathrobe over a shirt and tie, sitting at a kitchen table and leaning toward his laptop with the furrowed focus of a scholar, chin on fist, the screen facing away from the camera. In the soft-focus doorway behind him his elderly mother stands holding a mug, watching him with quiet concern. Morning window light',
    altPrompt:
      'A day trader in her forties, a Romanian woman in reading glasses, wearing a terry bathrobe over a silk blouse and blazer, sitting at a kitchen table and leaning toward her laptop with the furrowed focus of a scholar, chin on fist, the screen facing away from the camera. In the soft-focus doorway behind her, her elderly mother stands holding a mug, watching her with quiet concern. Morning window light',
    personalScene:
      'in a terry bathrobe over a collared shirt, sitting at a kitchen table and leaning toward a laptop propped on a stack of plain thick books at chest height, its screen facing away from the camera, chin on fist with the furrowed focus of a scholar. In the soft-focus doorway behind them an older relative holding a mug watches with quiet concern. Morning window light',
  },
  {
    title: 'Senior Associate of Quiet Desperation',
    field: 'finance',
    cues: ['suffer', 'asked'],
    caption: 'You are the backbone of a company that does not know your last name.',
    happiness: 19,
    salary: 'Competitive (for 2008)',
    outlook: 'Stable',
    subject: 'woman',
    prompt:
      'A senior associate in her forties, a Korean American woman in a cardigan and pearl earrings, sitting perfectly upright at a beige cubicle desk, holding up a small slice of someone else\'s farewell cake on a paper plate at shoulder height beside her face and wearing a practised, hollow, polite smile. A drooping succulent sits on the cubicle shelf beside her shoulder. Fluorescent panels overhead, colleagues chatting far away in the background',
    altPrompt:
      'A senior associate in his forties, a Samoan man in a cardigan and a neat tie, sitting perfectly upright at a beige cubicle desk, holding up a small slice of someone else\'s farewell cake on a paper plate at shoulder height beside his face and wearing a practised, hollow, polite smile. A drooping succulent sits on the cubicle shelf beside his shoulder. Fluorescent panels overhead, colleagues chatting far away in the background',
    personalScene:
      'in a beige cardigan, sitting perfectly upright at a beige cubicle desk, holding up a small slice of someone else\'s farewell cake on a paper plate at shoulder height beside their face and wearing a practised, hollow, polite smile. A drooping succulent sits on the cubicle shelf beside their shoulder. Fluorescent panels overhead, colleagues chatting far away in the background',
  },
  {
    title: 'Retired Management Consultant (Age 29)',
    field: 'finance',
    cues: ['vision', 'palms'],
    caption: 'You disrupted your own career by strategically doing nothing. Bold move.',
    happiness: 82,
    salary: 'Savings running out',
    outlook: 'Advising from the hammock',
    subject: 'man',
    prompt:
      'A former management consultant aged twenty-nine, a Brazilian man in a crisp blue oxford shirt with the tie loosened and swim shorts, lying back in a hammock strung between two palms, eyes closed in complete peace, a whiteboard marker still tucked behind one ear and a closed laptop resting on his chest. His head and shoulders sit in the centre of the frame. Dappled shade under the palm leaves',
    altPrompt:
      'A former management consultant aged twenty-nine, a Chinese Canadian woman in a crisp blue oxford shirt with the tie loosened and swim shorts, lying back in a hammock strung between two palms, eyes closed in complete peace, a whiteboard marker still tucked behind one ear and a closed laptop resting on her chest. Her head and shoulders sit in the centre of the frame. Dappled shade under the palm leaves',
    personalScene:
      'in a crisp blue oxford shirt and swim shorts, lying back in a hammock strung between two palms, eyes closed in complete peace, a whiteboard marker still tucked behind one ear and a closed laptop resting on their chest like a book they will never open. Their head and shoulders sit in the centre of the frame. Dappled shade under the palm leaves',
  },
  {
    title: 'Middle Manager Who Peaked at the Strategy Offsite',
    field: 'finance',
    cues: ['translator', 'desk'],
    caption: 'Your SWOT analysis was legendary. That was 2019. You have been coasting since.',
    happiness: 38,
    salary: 'Band 4 (ceiling reached)',
    outlook: 'Restructuring imminent',
    subject: 'man',
    prompt:
      'A middle manager in his fifties, a white man in a tucked-in polo shirt and khakis, standing alone in an emptied hotel function room, holding a small blank crystal award against his chest with both hands and gazing wistfully into the middle distance. Behind him the chairs are stacked against the wall and a cleaner vacuums the carpet. Flat fluorescent light mixed with grey window light',
    altPrompt:
      'A middle manager in her fifties, a Haitian woman in a tucked-in polo shirt and khakis, standing alone in an emptied hotel function room, holding a small blank crystal award against her chest with both hands and gazing wistfully into the middle distance. Behind her the chairs are stacked against the wall and a cleaner vacuums the carpet. Flat fluorescent light mixed with grey window light',
    personalScene:
      'in a tucked-in polo shirt and khakis, standing alone in an emptied hotel function room, holding a small blank crystal award against their chest with both hands and gazing wistfully into the middle distance. Behind them the chairs are stacked against the wall and a cleaner vacuums the carpet. Flat fluorescent light mixed with grey window light',
  },
  {
    title: 'Strategy Consultant for Problems That Don\'t Exist',
    field: 'finance',
    cues: ['improv', 'translator'],
    caption: 'You solve problems that nobody has, and you charge by the hour for it.',
    happiness: 56,
    salary: 'Retainer-based fiction',
    outlook: 'Synergy pending',
    subject: 'woman',
    prompt:
      'A strategy consultant in her forties, an Indian woman in a tailored camel blazer, standing in a bright, sparse office and gesturing with grave urgency at a perfectly ordinary office water cooler right beside her, its big water bottle level with her shoulder, as if presenting a crisis. A puzzled facilities worker in overalls stands on the other side of the water cooler, looking at it and then at her. Clean daylight from floor-to-ceiling windows',
    altPrompt:
      'A strategy consultant in his forties, a Czech man in a tailored camel blazer, standing in a bright, sparse office and gesturing with grave urgency at a perfectly ordinary office water cooler right beside him, its big water bottle level with his shoulder, as if presenting a crisis. A puzzled facilities worker in overalls stands on the other side of the water cooler, looking at it and then at him. Clean daylight from floor-to-ceiling windows',
    personalScene:
      'in a tailored camel blazer, standing in a bright, sparse office and gesturing with grave urgency at a perfectly ordinary office water cooler right beside them, its big water bottle level with their shoulder, as if presenting a crisis. A puzzled facilities worker in overalls stands on the other side of the water cooler, looking at it and then back at the consultant. Clean daylight from floor-to-ceiling windows',
  },
  {
    title: 'Senior Bureaucrat, Department of Doing Things Correctly',
    field: 'finance',
    cues: ['grind', 'desk'],
    caption: 'You have processed 10,000 forms without a single error. Nobody has thanked you once.',
    happiness: 35,
    salary: 'Government grade (with pension)',
    outlook: 'Predictably stable',
    subject: 'man',
    prompt:
      'A civil servant in his sixties, a Ghanaian man in an impeccable grey suit and tie, sitting at a perfectly ordered wooden desk with a rubber stamp raised mid-air at chest height above a single blank form, an exactly squared tower of identical blank forms beside him reaching his shoulder. Serene, precise expression. Institutional fluorescent light and a tall office window',
    altPrompt:
      'A civil servant in her sixties, a Belgian woman in an impeccable grey suit and silk neck bow, sitting at a perfectly ordered wooden desk with a rubber stamp raised mid-air at chest height above a single blank form, an exactly squared tower of identical blank forms beside her reaching her shoulder. Serene, precise expression. Institutional fluorescent light and a tall office window',
    personalScene:
      'in an impeccable grey suit, sitting at a perfectly ordered wooden desk with a rubber stamp raised mid-air at chest height above a single blank form, an exactly squared tower of identical blank forms beside them reaching their shoulder. Serene, precise expression. Institutional fluorescent light and a tall office window',
  },
  {
    title: 'Chief Coffee Officer and Meeting Survivor',
    field: 'finance',
    cues: ['coffee', 'lunch'],
    caption: 'Your bloodstream is 73% caffeine and your calendar is 100% meetings about meetings.',
    happiness: 31,
    salary: 'Benefits include free coffee',
    outlook: 'One more meeting',
    subject: 'woman',
    prompt:
      'An office worker in her fifties, an Irish woman with auburn hair, reading glasses on a chain and a navy cardigan, walking out of one glass meeting room straight toward the next, carrying a cardboard tray of four coffees against her chest with a laptop clamped under one arm, eyes glazed with heroic fatigue. Colleagues sit in meetings behind every glass wall. Flat office daylight',
    altPrompt:
      'An office worker in his fifties, a Tunisian man with a grey moustache, reading glasses on a chain and a navy cardigan, walking out of one glass meeting room straight toward the next, carrying a cardboard tray of four coffees against his chest with a laptop clamped under one arm, eyes glazed with heroic fatigue. Colleagues sit in meetings behind every glass wall. Flat office daylight',
    personalScene:
      'in a navy cardigan, walking out of one glass meeting room straight toward the next, carrying a cardboard tray of four coffees against their chest with a laptop clamped under one arm, eyes glazed with heroic fatigue. Colleagues sit in meetings behind every glass wall. Flat office daylight',
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
    subject: 'woman',
    prompt:
      'An aspiring content creator in her early twenties, a Nigerian woman in a bright matching two-piece outfit, mid-performance in a small tidy bedroom, framing her face with both hands and beaming at a phone mounted in a ring light. Her entire live audience is her grandmother, sitting on the edge of the bed just behind her, the old lady\'s face level with the creator\'s shoulder, watching politely with folded hands. The ring light is the main light',
    altPrompt:
      'An aspiring content creator in his early twenties, a Bolivian man in a bright matching two-piece outfit, mid-performance in a small tidy bedroom, framing his face with both hands and beaming at a phone mounted in a ring light. His entire live audience is his grandmother, sitting on the edge of the bed just behind him, her face level with his shoulder, watching politely with folded hands. The ring light is the main light',
    personalScene:
      'in a bright colour-blocked tracksuit, mid-performance in a small tidy bedroom, framing their face with both hands and beaming at a phone mounted in a ring light. Their entire live audience is one older relative sitting on the edge of the bed just behind them, face level with the creator\'s shoulder, watching politely with folded hands. The ring light is the main light',
  },
  {
    title: 'LinkedIn Influencer Emeritus',
    field: 'viral',
    cues: ['network', 'desk'],
    caption: 'Your network is your net worth, and both are currently in the red.',
    happiness: 41,
    salary: 'Paid in exposure',
    outlook: 'Open to opportunities',
    subject: 'man',
    prompt:
      'A veteran networking influencer in his sixties, a silver-haired Black man in a navy blazer over a turtleneck with a headset microphone, delivering an impassioned keynote from a lectern in the middle of a conference room set up in the round, both arms spread wide. The rows of folding chairs circling him are all empty except one just behind him, a coat draped over its back beside his shoulder. One spotlight from above, the rest of the room dim',
    altPrompt:
      'A veteran networking influencer in her sixties, a silver-haired Australian woman in a navy blazer over a turtleneck with a headset microphone, delivering an impassioned keynote from a lectern in the middle of a conference room set up in the round, both arms spread wide. The rows of folding chairs circling her are all empty except one just behind her, a coat draped over its back beside her shoulder. One spotlight from above, the rest of the room dim',
    personalScene:
      'in a navy blazer over a turtleneck with a headset microphone, delivering an impassioned keynote from a chest-high lectern in the middle of a conference room set up in the round, both arms spread wide. The rows of folding chairs circling them are all empty except one just behind them, a coat draped over its back beside their shoulder. One spotlight from above, the rest of the room dim',
  },
  {
    title: 'Digital Nomad Coach (Currently Offline)',
    field: 'viral',
    cues: ['vision', 'palms'],
    caption: 'You coach others on remote freedom from a beach with no Wi-Fi. The irony is lost on you.',
    happiness: 55,
    salary: 'Location-independent poverty',
    outlook: 'Vibes-based strategy',
    subject: 'woman',
    prompt:
      'A digital nomad coach in her thirties, a Swedish woman in a wide sun hat and white linen, sitting on a rock in a remote, empty cove with her laptop open on her knees, holding up the loose end of a long orange extension cable at chest height and studying it with serene confusion. The cable trails away across the sand to nothing. A few goats graze on the hillside behind her. Soft overcast light',
    altPrompt:
      'A digital nomad coach in his thirties, a Malaysian man in a wide sun hat and white linen, sitting on a rock in a remote, empty cove with his laptop open on his knees, holding up the loose end of a long orange extension cable at chest height and studying it with serene confusion. The cable trails away across the sand to nothing. A few goats graze on the hillside behind him. Soft overcast light',
    personalScene:
      'in loose white linen, sitting on a rock in a remote, empty cove with a laptop open on their knees, holding up the loose end of a long orange extension cable at chest height and studying it with serene confusion. The cable trails away across the sand to nothing. A few goats graze on the hillside behind them. Soft overcast light',
  },
  {
    title: 'Productivity YouTuber With Zero Productivity',
    field: 'viral',
    cues: ['same', 'thursday'],
    caption: 'You spent 6 hours organizing your to-do list. The to-do list has one item: make to-do list.',
    happiness: 40,
    salary: 'Ad revenue: $1.23',
    outlook: 'Optimizing the optimization',
    subject: 'man',
    prompt:
      'A productivity creator in his twenties, a white man with neat side-parted hair and a crisp button-down, sitting at an immaculate minimalist desk with a camera on a boom arm pointed at him, holding a steel ruler and a single pen up at chest height and squinting to align them perfectly parallel. Six identical pens lie evenly spaced on a slim wall shelf beside his shoulder. Soft window light and one desk lamp',
    altPrompt:
      'A productivity creator in her twenties, a Kenyan woman with neat braids and a crisp button-down, sitting at an immaculate minimalist desk with a camera on a boom arm pointed at her, holding a steel ruler and a single pen up at chest height and squinting to align them perfectly parallel. Six identical pens lie evenly spaced on a slim wall shelf beside her shoulder. Soft window light and one desk lamp',
    personalScene:
      'in a crisp button-down shirt, sitting at an immaculate minimalist desk with a camera on a boom arm pointed at them, holding a plain steel ruler and a single pen up at chest height and squinting to align them perfectly parallel. Six identical pens lie evenly spaced on a slim wall shelf beside their shoulder. Soft window light and one desk lamp',
  },
  {
    title: 'Thought Leader Without the Thought',
    field: 'viral',
    cues: ['translator', 'bell'],
    caption: 'You have vision. You have passion. You have no actionable plan whatsoever.',
    happiness: 46,
    salary: 'Speaking fees (waived)',
    outlook: 'Disruption imminent',
    subject: 'man',
    prompt:
      'A thought leader in his thirties, a white man in a black t-shirt under a blazer with a headset microphone, standing on a round red carpet on a conference stage, arms spread wide in a grand visionary gesture in front of a giant projection screen that is completely blank white. In the dim front row a single audience member is asleep. One spotlight on the speaker',
    altPrompt:
      'A thought leader in her thirties, a Pakistani woman in a black t-shirt under a blazer with a headset microphone, standing on a round red carpet on a conference stage, arms spread wide in a grand visionary gesture in front of a giant projection screen that is completely blank white. In the dim front row a single audience member is asleep. One spotlight on the speaker',
    personalScene:
      'in a black t-shirt under a blazer with a headset microphone, standing on a round red carpet on a conference stage, arms spread wide in a grand visionary gesture, a presentation clicker raised at shoulder height, in front of a giant projection screen that is completely blank white. In the dim front row a single audience member is asleep. One spotlight on the speaker',
  },
  {
    title: 'VP of Hustle Culture, Self-Appointed',
    field: 'viral',
    cues: ['grind', 'coffee'],
    caption: 'You wake up at 5am to optimize a life that does not need optimizing.',
    happiness: 23,
    salary: '5am wake-up call (unpaid)',
    outlook: 'Grinding never stops',
    subject: 'woman',
    prompt:
      'A self-appointed hustle executive in her thirties, a Black British woman in a blazer over gym leggings, walking briskly on a treadmill desk at five in the morning in a dark apartment, wireless earbuds in, gripping a tall green smoothie at chest height, eyes wide with barely contained intensity. Blue pre-dawn light at the window and a single desk lamp',
    altPrompt:
      'A self-appointed hustle executive in his thirties, a Dutch man in a blazer over gym shorts, walking briskly on a treadmill desk at five in the morning in a dark apartment, wireless earbuds in, gripping a tall green smoothie at chest height, eyes wide with barely contained intensity. Blue pre-dawn light at the window and a single desk lamp',
    personalScene:
      'in a blazer over gym clothes with wireless earbuds in, walking briskly on a treadmill desk at five in the morning in a dark apartment, gripping a tall green smoothie at chest height, eyes wide with barely contained intensity. Faint blue pre-dawn light at the window and a single desk lamp',
  },
  {
    title: 'Burnout Survivor Currently "Finding Themselves"',
    field: 'viral',
    cues: ['suffer', 'palms'],
    caption: 'You worked 80-hour weeks to earn a vacation you are too tired to enjoy.',
    happiness: 51,
    salary: 'Sabbatical (unpaid)',
    outlook: 'Recovering',
    subject: 'man',
    prompt:
      'A burnt-out professional in his forties, a Chinese American man in a wrinkled white dress shirt and suit trousers, sitting cross-legged on a mat in a calm meditation retreat hall among serene people in loose linen who all have their eyes closed. His eyes are wide open in a thousand-yard stare, his phone clutched face-down against his chest in both hands. Soft daylight through paper screens and wooden beams',
    altPrompt:
      'A burnt-out professional in her forties, an Armenian woman in a wrinkled white dress shirt and suit trousers, sitting cross-legged on a mat in a calm meditation retreat hall among serene people in loose linen who all have their eyes closed. Her eyes are wide open in a thousand-yard stare, her phone clutched face-down against her chest in both hands. Soft daylight through paper screens and wooden beams',
    personalScene:
      'in a wrinkled white dress shirt and suit trousers, sitting cross-legged on a mat in a calm meditation retreat hall among serene people in loose linen who all have their eyes closed. Their own eyes are wide open in a thousand-yard stare, a phone clutched face-down against their chest in both hands. Soft daylight through paper screens and wooden beams',
  },
  {
    title: 'Professional Taste Tester (Self-Appointed)',
    field: 'viral',
    cues: ['same', 'lunch'],
    caption: 'You have reviewed every item in the vending machine. B7 is your magnum opus.',
    happiness: 68,
    salary: 'Vending machine budget',
    outlook: 'Flavor matrix expanding',
    subject: 'woman',
    prompt:
      'A self-appointed taste tester in her forties, a Peruvian woman in a neat office blouse, standing in a corporate break room in front of a vending machine, holding a single plain foil packet of crisps up to the light and inspecting it through a jeweller\'s loupe with grave professional seriousness. Two colleagues watch from the doorway at a safe distance. Fluorescent break-room light',
    altPrompt:
      'A self-appointed taste tester in his forties, a Nepali man in a neat office shirt, standing in a corporate break room in front of a vending machine, holding a single plain foil packet of crisps up to the light and inspecting it through a jeweller\'s loupe with grave professional seriousness. Two colleagues watch from the doorway at a safe distance. Fluorescent break-room light',
    personalScene:
      'in a neat office shirt, standing in a corporate break room in front of a vending machine, holding a single plain foil packet of crisps up at shoulder height beside their face and inspecting it through a jeweller\'s loupe with grave professional seriousness. Two colleagues watch from the doorway at a safe distance. Fluorescent break-room light',
  },
  {
    title: 'Corporate Event Planner Nobody Invited',
    field: 'viral',
    cues: ['improv', 'asked'],
    caption: 'You organized the team-building retreat. Three people came. One was from IT support.',
    happiness: 33,
    salary: 'Per-event basis',
    outlook: 'RSVP pending',
    subject: 'man',
    prompt:
      'A corporate event planner in his thirties, a Puerto Rican man in a headset and a neat lilac shirt, standing under a sagging balloon arch in a hotel ballroom and holding out a large tray of identical cupcakes at chest height with a brave, hopeful smile. Behind him a long banquet table set for thirty has only three guests, standing far apart and avoiding eye contact. Ballroom chandeliers and grey window light',
    altPrompt:
      'A corporate event planner in her thirties, a Canadian woman with a red bob, in a headset and a neat lilac shirt, standing under a sagging balloon arch in a hotel ballroom and holding out a large tray of identical cupcakes at chest height with a brave, hopeful smile. Behind her a long banquet table set for thirty has only three guests, standing far apart and avoiding eye contact. Ballroom chandeliers and grey window light',
    personalScene:
      'in a headset and a neat lilac shirt, standing under a sagging balloon arch in a hotel ballroom and holding out a large tray of identical cupcakes at chest height with a brave, hopeful smile. Behind them a long banquet table set for thirty has only three guests, standing far apart and avoiding eye contact. Ballroom chandeliers and grey window light',
  },
  {
    title: 'Podcast Host, Listener Count: Mom',
    field: 'viral',
    cues: ['improv', 'ghost'],
    caption: 'Episode 112 is out. The analytics show one listener in one city. She always listens to the end.',
    happiness: 79,
    salary: 'Sponsored by your own savings',
    outlook: 'Renewed for season 9',
    subject: 'man',
    prompt:
      'A podcast host in his thirties, a Mexican American man in a cardigan, leaning into a large studio microphone with headphones on in a spare bedroom lined with plain grey acoustic foam, mid-sentence and gesturing with real passion. Through the open doorway behind him his mother sits on a sofa with a single earbud in, giving him a supportive thumbs up. One warm desk lamp',
    altPrompt:
      'A podcast host in her thirties, a Vietnamese woman in a cardigan, leaning into a large studio microphone with headphones on in a spare bedroom lined with plain grey acoustic foam, mid-sentence and gesturing with real passion. Through the open doorway behind her, her mother sits on a sofa with a single earbud in, giving her a supportive thumbs up. One warm desk lamp',
    personalScene:
      'in a cardigan with headphones on, leaning into a large studio microphone on a boom arm right beside their face in a spare bedroom lined with plain grey acoustic foam, mid-sentence and gesturing at chest height with real passion. Through the open doorway behind them a proud parent sits on a sofa with a single earbud in, giving a supportive thumbs up. One warm desk lamp',
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
  personalScene:
    'standing at a rural crossroads on a wide flat plain in business casual clothes, holding a paper map upside down at chest height with a calm, unbothered expression, a weathered wooden signpost at shoulder height beside them pointing four blank arms in four different directions, flat overcast light and a pale sky',
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
  const portraitSubject = portraitIdFor(answers.portrait_subject) ?? DEFAULT_PORTRAIT;

  return {
    ...publicFields(career),
    prompt: promptFor(career, portraitSubject),
    portraitSubject,
    evidence: evidenceFor(career, ids),
  };
}

/**
 * The scene for the photographer's answer. Each career is written once with a
 * woman or a man as its subject (`subject`, `prompt`) and once with the other
 * (`altPrompt`). "Surprise me" keeps the hand-picked original, which is what
 * keeps the series varied. The career itself never depends on this choice.
 */
function promptFor(career, portraitSubject) {
  if (portraitSubject === DEFAULT_PORTRAIT || portraitSubject === career.subject) return career.prompt;
  return career.altPrompt || career.prompt;
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

/**
 * The identity-neutral scene for a saved result's title (personal portraits),
 * or null for a title no longer in the table (results saved before the quiz
 * redesign): those users retake the questionnaire first.
 */
function personalSceneFor(title) {
  if (title === FALLBACK.title) return FALLBACK.personalScene;
  return CAREERS.find((c) => c.title === title)?.personalScene ?? null;
}

module.exports = { mapCareer, promptFor, personalSceneFor, CAREERS, FALLBACK, SAMPLE_ANSWERS, answersFromIds, sampleCareers };

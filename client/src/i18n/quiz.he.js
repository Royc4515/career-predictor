// Hebrew edition of the quiz copy in ../content.js.
//
// don't touch / Options map to the English by index: the English text is still
// what the client sends and the server validates, so keep every options array
// in exactly the English order. FINDINGS_HE is keyed by the English option
// text for the same reason (results store English answers).
//
// Adapted for an Israeli office rather than translated: the dreaded day is
// Sunday, the weekend is Saturday, Thursday is the end of the week. Options are
// first person in forms that do not mark gender (future tense, nouns), and the
// reader is addressed in the plural. Options are quoted on the report, so no
// double quotes inside them.

export const QUESTIONS_HE = [
  {
    id: 'strength',
    label: 'תחת לחץ',
    question: 'הדמו מתחיל בעוד עשר דקות, והלפטופ בדיוק שבק חיים. מה עושים?',
    options: [
      'אציג מהראש. השקפים רק עיכבו אותי',
      'אאלתר על הלוח עם ביטחון עצמי שלא הרווחתי',
      'אתקן אותו עם אטב והרבה עצבים',
      'אתקשר למישהו שמכיר מישהו',
    ],
  },
  {
    id: 'monday_vibe',
    label: 'ימי ראשון',
    question: 'יום ראשון, 9:02 בבוקר. מה עושים קודם?',
    options: [
      'הקפה השלישי שלי (והשעה רק 9:02)',
      'אבהה בקיר עד הצהריים',
      'האמת? בדיוק כמו אתמול',
      'יום ראשון הוא היום האהוב עליי (ברור)',
    ],
  },
  {
    id: 'coworker_desc',
    label: 'מוניטין',
    question: 'במשרד מכירים אתכם בתור…',
    options: [
      'תמיד אפשר להפיל עליי עוד משימה קטנה. שוב.',
      'הרעיונות שלי דורשים מתורגמן',
      'מי? אף פעם לא נפגשנו',
      'הסמכות העליונה בענייני הזמנת צהריים ב-Wolt',
    ],
  },
  {
    id: 'five_year_goal',
    label: 'תוכנית לחמש שנים',
    question: 'איפה אתם רואים את עצמכם בעוד חמש שנים?',
    options: [
      'אצלצל בפעמון בבורסה. לא משנה איזו.',
      'איפשהו עם דקלים ו-Wi-Fi גרוע',
      'בעזרת ה׳, באותו שולחן',
      'האופק שלי נגמר ביום חמישי',
    ],
  },
  {
    id: 'desired_field',
    label: 'טאבים פתוחים',
    question: 'יש לכם 47 טאבים פתוחים בדפדפן. רובם…',
    options: [
      'מצגות למשקיעים ואפליקציה שגמורה ב-90%',
      'לוחות השראה ופונטים שלעולם לא אשלם עליהם',
      'גיליון שמנהל מעקב אחרי כל הגיליונות האחרים שלי',
      'הטוקבקים על הפוסט שלי',
    ],
  },
];

export const PORTRAIT_STEP_HE = {
  id: 'portrait_subject',
  label: 'תמונת שער',
  question: 'שאלה אחרונה, בשביל הצלם: את מי מצלמים?',
  options: ['צלמו אותי כאישה', 'צלמו אותי כגבר', 'תפתיעו אותי. הדסק כבר ילהק מישהו', 'אשתמש בתמונה שלי'],
};

// Dry on purpose, like the English: the joke is trivial evidence meeting a
// confident conclusion. "הדסק" is the magazine's editorial desk, as in the UI.
// Findings and analysis notes are impersonal: they never address the reader.
export const FINDINGS_HE = {
  // The demo is in ten minutes and the laptop just died.
  'Present from memory. Slides were holding me back': 'זוהה בלבול בין היעדר שקפים לבין חזון. גם משקיעים כבר נפלו בפח.',
  'Improvise with a whiteboard and unearned confidence':
    'רמת הביטחון עלתה על כמות הראיות ביחס שהמכשירים שלנו לא מסוגלים להציג.',
  'Fix it with a paperclip and pure spite': 'התקלה טופלה. שורש הבעיה במקומו. קידום לא באופק.',
  'Call a guy who knows a guy': 'גם למישהו שמכיר מישהו כבר התקשרו. הוא לא זמין.',
  // Monday, 9:02 a.m.
  "Third coffee (it's 9:02)": 'מתיישב עם דופק במנוחה שהדסק העדיף לא למדוד.',
  'Stare at the wall until lunch': 'תפוקה לפני הצהריים: לא ניתנת למדידה. אחרי הצהריים: כנ״ל.',
  'Same as Sunday, honestly': 'לא אותר סוף שבוע. ייתכן שמעולם לא הותקן.',
  'Genuinely love Mondays (liar)': 'סומן על ידי הפוליגרף של הדסק. גם הוא שיקר.',
  // Your coworkers know you as...
  'The one who can just quickly do it. Again.': 'ה״רק חמש דקות״ האלה נמשכות כבר ארבע שנים.',
  'The one whose ideas need a translator': 'הוגשו שלושה רעיונות. אף אחד מהם לא הובן. אחד נרשם כפטנט בטעות.',
  'Who? We have never met': 'משאבי אנוש מאשרים שאתם קיימים. הקולגות עדיין לא.',
  'The one who knows when lunch arrives': 'מקור המידע האמין ביותר בבניין.',
  // Five years from now.
  'Ringing the bell at a stock exchange. Any stock exchange': 'הפעמון אותר. הבורסה עדיין לא חזרה אלינו.',
  'Somewhere with palm trees and bad Wi-Fi': 'עוצמת הקליטה תואמת את התחזית המקצועית.',
  'Same desk. Hopefully.': 'השאפתנות נמדדה בגובה הכיסא.',
  "I can't see past Thursday": 'אופק תכנון: שלושה ימים. הממוצע בענף: גם שלושה ימים.',
  // 47 open tabs.
  'Pitch decks and an app that is 90% done': 'עשרת האחוזים הנותרים צפויים לגזול את שארית חייכם.',
  'Moodboards and fonts I will never pay for': 'מחלקת הרישוי עודכנה.',
  'A spreadsheet tracking my other spreadsheets':
    'קובצי הגיליון כבר עוקבים זה אחרי זה. אף אחד לא עוקב אחרי מי שיצר אותם.',
  'My own comments section': 'התגובה המובילה נכתבה מהחשבון שלכם. גם השנייה.',
};

// Same keys and bands as ANALYSIS_NOTES; lib/analysis.js picks one per row.
// The DNA match is always 97, hence the remaining 3%.
export const ANALYSIS_NOTES_HE = {
  dna: {
    low: 'ייתכן שהדגימה זוהמה באופטימיות.',
    mid: 'שלושת האחוזים הנותרים עדיין חולמים להיות וטרינרים.',
    high: 'שלושת האחוזים הנותרים עדיין חולמים להיות וטרינרים.',
  },
  market: {
    low: 'השוק עודכן ומבקש לשמור על פרטיותו.',
    mid: 'יש ביקוש בשוק אחד לפחות. לא בשוק הזה.',
    high: 'הביקוש גבוה. בעיקר מצדכם.',
  },
  passion: {
    low: 'התשוקה אותרה. ההתאמה בטיפול.',
    mid: 'אכפת לכם מהתפקיד יותר משלתפקיד אכפת מכם.',
    high: 'כנות ברמה מדאיגה. המעקב נמשך.',
  },
  stability: {
    low: 'יציב כמו מגדל ג׳נגה.',
    mid: 'יציב עד הארגון מחדש הבא.',
    high: 'יציבות חשודה. נקבעה ביקורת.',
  },
};

export const PRESS_STEPS_HE = [
  'מראיינים את הקולגות שלכם',
  'מתעלמים ממה שהם ענו',
  'מתייעצים עם הטבלה',
  'מדלגים על בדיקת העובדות',
  'מנסחים את הכותרת שלכם',
  'שולחים את השער לדפוס',
];

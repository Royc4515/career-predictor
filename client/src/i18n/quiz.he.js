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
    question: 'עשר דקות לדמו, והלפטופ מת הרגע. אתם…',
    options: [
      'אציג מהראש. השקפים רק עיכבו אותי',
      'אאלתר על הלוח עם ביטחון עצמי שלא הרווחתי',
      'אתקן עם אטב, רק מתוך דווקא',
      'אתקשר למישהו שמכיר מישהו',
    ],
  },
  {
    id: 'monday_vibe',
    label: 'ימי ראשון',
    question: 'יום ראשון, 9:02 בבוקר. מה עושים קודם?',
    options: [
      'הפוך שלישי (והשעה רק 9:02)',
      'אבהה בקיר עד הצהריים',
      'האמת? בדיוק כמו בשבת',
      'יום ראשון הוא באמת היום האהוב עליי (שקר)',
    ],
  },
  {
    id: 'coworker_desc',
    label: 'מוניטין',
    question: 'במשרד מכירים אתכם בתור…',
    options: [
      'הכתובת הקבועה לכל משימה של חמש דקות. שוב.',
      'מקור הרעיונות שאי אפשר להבין בלי מתורגמן',
      'מי? אף פעם לא נפגשנו',
      'הסמכות העליונה בשאלה מתי מגיע ה-Wolt',
    ],
  },
  {
    id: 'five_year_goal',
    label: 'תוכנית חומש',
    question: 'איפה אתם רואים את עצמכם בעוד חמש שנים?',
    options: [
      'אצלצל בפעמון בנאסד״ק. או בכל בורסה שתסכים',
      'מתחת לדקל, עם Wi-Fi חלש',
      'באותו שולחן. בעזרת השם.',
      'האופק שלי נגמר ביום חמישי',
    ],
  },
  {
    id: 'desired_field',
    label: 'טאבים פתוחים',
    question: 'יש לכם 47 טאבים פתוחים בדפדפן. רובם…',
    options: [
      'מצגות למשקיעים ואפליקציה שמוכנה ב-90%',
      'מודבורדים ופונטים שלעולם לא אשלם עליהם',
      'קובץ Excel שעוקב אחרי כל שאר קובצי ה-Excel שלי',
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
  'Present from memory. Slides were holding me back':
    'אובחן בלבול בין היעדר שקפים לבין חזון. גם משקיעים כבר עשו את הטעות הזאת.',
  'Improvise with a whiteboard and unearned confidence':
    'הביטחון העצמי עלה על הראיות ביחס שהמכשירים שלנו לא מסוגלים להציג.',
  'Fix it with a paperclip and pure spite': 'התקלה טופלה. שורש הבעיה במקומו. קידום לא באופק.',
  'Call a guy who knows a guy': 'גם המישהו של המישהו קיבל טלפון. הוא בחו״ל.',
  // Monday, 9:02 a.m.
  "Third coffee (it's 9:02)": 'מתיישב עם דופק במנוחה שהדסק העדיף לא למדוד.',
  'Stare at the wall until lunch': 'תפוקה לפני הצהריים: לא ניתנת למדידה. אחרי הצהריים: כנ״ל.',
  'Same as Sunday, honestly': 'לא אותר סוף שבוע. ייתכן שמעולם לא הותקן.',
  'Genuinely love Mondays (liar)': 'סומן על ידי הפוליגרף של הדסק, שגם הוא שיקר.',
  // Your coworkers know you as...
  'The one who can just quickly do it. Again.': 'חמש הדקות נמשכות כבר ארבע שנים.',
  'The one whose ideas need a translator': 'הוגשו שלושה רעיונות. אף אחד מהם לא הובן. אחד נרשם כפטנט בטעות.',
  'Who? We have never met': 'משאבי אנוש מאשרים שהתקן מאויש. הקולגות לא.',
  'The one who knows when lunch arrives': 'מקור המידע האמין ביותר בבניין.',
  // Five years from now.
  'Ringing the bell at a stock exchange. Any stock exchange': 'הפעמון אותר. הבורסה עוד לא חזרה אלינו.',
  'Somewhere with palm trees and bad Wi-Fi': 'עוצמת הקליטה תואמת את התחזית המקצועית.',
  'Same desk. Hopefully.': 'השאפתנות נמדדה בגובה הכיסא.',
  "I can't see past Thursday": 'אופק תכנון: שלושה ימים. הממוצע בענף: גם שלושה ימים.',
  // 47 open tabs.
  'Pitch decks and an app that is 90% done': 'ה-10% הנותרים צפויים לקחת את שארית החיים.',
  'Moodboards and fonts I will never pay for': 'מחלקת הרישוי עודכנה.',
  'A spreadsheet tracking my other spreadsheets':
    'קובצי ה-Excel כבר עוקבים זה אחרי זה. אחרי מי שבנה אותם אף אחד לא עוקב.',
  'My own comments section': 'הטוקבק המוביל נכתב מאותו חשבון. גם השני.',
};

// Same keys and bands as ANALYSIS_NOTES; lib/analysis.js picks one per row.
// The DNA match is always 97, hence the remaining 3%.
export const ANALYSIS_NOTES_HE = {
  dna: {
    low: 'ייתכן שהדגימה זוהמה באופטימיות.',
    mid: 'ה-3% הנותרים עדיין חולמים על וטרינריה.',
    high: 'ה-3% הנותרים עדיין חולמים על וטרינריה.',
  },
  market: {
    low: 'השוק עודכן ומבקש לשמור על פרטיותו.',
    mid: 'יש ביקוש בשוק אחד לפחות. לא בזה.',
    high: 'ביקוש חזק, רובו תוצרת בית.',
  },
  passion: {
    low: 'התשוקה אותרה. ההתאמה בטיפול.',
    mid: 'האהבה לתפקיד חד-צדדית.',
    high: 'כנות ברמה מדאיגה. המעקב נמשך.',
  },
  stability: {
    low: 'יציבות של מגדל ג׳נגה.',
    mid: 'יציבות מובטחת עד הרה-ארגון הבא.',
    high: 'יציבות חשודה. נקבעה ביקורת.',
  },
};

export const PRESS_STEPS_HE = [
  'מראיינים את הקולגות שלכם',
  'מתעלמים מהתשובות שלהם',
  'מתייעצים עם הטבלה',
  'מדלגים על בדיקת העובדות',
  'מנסחים את הכותרת שלכם',
  'שולחים את השער לדפוס',
];

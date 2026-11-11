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
    question: 'הדמו בעוד עשר דקות והלפטופ בדיוק מת. אתם…',
    options: [
      'אציג מהראש. השקפים רק עיכבו אותי',
      'אאלתר על הלוח עם ביטחון עצמי שלא הרווחתי',
      'אתקן עם אטב ודווקאיות טהורה',
      'אתקשר למישהו שמכיר מישהו',
    ],
  },
  {
    id: 'monday_vibe',
    label: 'ימי ראשון',
    question: 'יום ראשון, 9:02 בבוקר. מה הדבר הראשון?',
    options: [
      'הפוך שלישי (והשעה 9:02)',
      'אבהה בקיר עד הצהריים',
      'בדיוק כמו בשבת, בכנות',
      'יום ראשון הוא היום האהוב עליי (שקר)',
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
      'מתחת לעץ דקל עם Wi-Fi חלש',
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
      'גיליון אקסל שעוקב אחרי שאר גיליונות האקסל שלי',
      'הטוקבקים לפוסט של עצמי',
    ],
  },
];

export const PORTRAIT_STEP_HE = {
  id: 'portrait_subject',
  label: 'תמונת שער',
  question: 'שאלה אחרונה, לצילומי השער. את מי מצלמים?',
  options: ['צלמו אותי כאישה', 'צלמו אותי כגבר', 'תפתיעו אותי. המערכת כבר תלהק מישהו', 'אשתמש בתמונה שלי'],
};

// Dry on purpose, like the English: the joke is trivial evidence meeting a
// confident conclusion. "המערכת" is the magazine's editorial desk.
export const FINDINGS_HE = {
  // The demo is in ten minutes and the laptop just died.
  'Present from memory. Slides were holding me back':
    'אובחן בלבול בין היעדר שקפים לבין חזון. גם משקיעים כבר עשו את הטעות הזאת.',
  'Improvise with a whiteboard and unearned confidence':
    'הביטחון העצמי עלה על הראיות ביחס שהמכשירים שלנו לא מסוגלים להציג.',
  'Fix it with a paperclip and pure spite': 'התקלה טופלה. שורש הבעיה במקומו. קידום לא באופק.',
  'Call a guy who knows a guy': 'גם המישהו שהוא מכיר קיבל טלפון. הוא בחו״ל.',
  // Monday, 9:02 a.m.
  "Third coffee (it's 9:02)": 'תואם דופק במנוחה שהמערכת החליטה לא למדוד.',
  'Stare at the wall until lunch': 'תפוקה לפני הצהריים: לא ניתנת למדידה. אחרי הצהריים: כנ״ל.',
  'Same as Sunday, honestly': 'לא אותר סוף שבוע. ייתכן שמעולם לא הותקן.',
  'Genuinely love Mondays (liar)': 'הפוליגרף של המערכת סימן את זה. גם הפוליגרף שיקר.',
  // Your coworkers know you as...
  'The one who can just quickly do it. Again.': 'חמש הדקות נמשכות כבר ארבע שנים.',
  'The one whose ideas need a translator': 'הוגשו שלושה רעיונות. אף אחד לא הובן. אחד נרשם כפטנט בטעות.',
  'Who? We have never met': 'משאבי אנוש מאשרים שאתם קיימים. הקולגות לא.',
  'The one who knows when lunch arrives': 'מקור המידע האמין ביותר בבניין.',
  // Five years from now.
  'Ringing the bell at a stock exchange. Any stock exchange': 'הפעמון אותר. הבורסה עוד לא חזרה אלינו.',
  'Somewhere with palm trees and bad Wi-Fi': 'עוצמת הקליטה תואמת את התחזית המקצועית.',
  'Same desk. Hopefully.': 'השאפתנות נמדדה בגובה הכיסא.',
  "I can't see past Thursday": 'אופק תכנון: שלושה ימים. הממוצע בענף: גם שלושה ימים.',
  // 47 open tabs.
  'Pitch decks and an app that is 90% done': 'ה-10% שנותרו צפויים לקחת את שארית חייכם.',
  'Moodboards and fonts I will never pay for': 'מחלקת הרישוי עודכנה.',
  'A spreadsheet tracking my other spreadsheets': 'הגיליונות כבר עוקבים זה אחרי זה. אחריכם אף אחד לא עוקב.',
  'My own comments section': 'הטוקבק המוביל הוא שלכם. גם השני.',
};

// Same keys and bands as ANALYSIS_NOTES; lib/analysis.js picks one per row.
// The DNA match is always 97, hence the remaining 3%.
export const ANALYSIS_NOTES_HE = {
  dna: {
    low: 'ייתכן שהדגימה זוהמה באופטימיות.',
    mid: 'ה-3% הנותרים הם החלק שבכם שחלם ללמוד וטרינריה.',
    high: 'ה-3% הנותרים הם החלק שבכם שחלם ללמוד וטרינריה.',
  },
  market: {
    low: 'השוק עודכן ומבקש לשמור על פרטיותו.',
    mid: 'יש ביקוש בשוק אחד לפחות. לא בזה.',
    high: 'ביקוש חזק, בעיקר מצדכם.',
  },
  passion: {
    low: 'התשוקה אותרה. ההתאמה בטיפול.',
    mid: 'לכם אכפת מזה יותר מאשר לתפקיד.',
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

# Quiz and career pool redesign: plan and self-review

Status: executed in the same PR as this document.

## 1. What was wrong (measured over all 1,024 answer sets)

- **The result barely depended on the answers.** Each of three rule tiers
  proposed a career and a hash of all five answers picked one. Changing a
  single answer changed the career 79% of the time, and a finance answer
  could land on a food or tech title. Satire works when the absurd result is
  *justified*; random absurdity reads as a slot machine.
- **Imbalance.** "Content Creator, 23 Followers" came out 8.8% of the time,
  four times the average.
- **Form questions, not jokes.** "What field are you targeting?" asks the
  user for the answer outright. Only two options were funny on their own.
- **Pool.** One title appeared twice in the table, two near-identical
  photographers, four variants of "remote hermit", several titles that
  describe instead of land a punchline, repeated salary and outlook lines.
- **No receipts.** The report never quoted the user's own answers back,
  which is what makes a result feel personal and screenshot-worthy.

## 2. Plan v1 (first draft)

1. Trait scoring: every option adds weights to 8 traits, every career has a
   trait profile, nearest profile wins.
2. Six scenario questions instead of five.
3. Rewrite the whole pool from scratch, about 50 titles.
4. Show which answers decided the result.

## 3. Self-review of v1

| Problem in v1 | Why it matters | Change |
|---|---|---|
| A trait vector per option and per career is hard to read and hard to tune; nobody can tell from the table why a career wins. | The point of the redesign is explainability. | Replace with **cues**: each career names the field it belongs to and two concrete answers that point at it. Score = matched cues. Readable in one line per career. |
| Six questions needs a seventh database column and changes the API. | Schema migration on a live Turso database for a copy change. | Keep **five** questions and the existing ids and columns. Only the wording and options change. |
| Rewriting the whole pool throws away titles that already work (the eight landing samples among them) and their freshly rewritten portrait prompts. | Churn without gain; the samples are the first thing visitors see. | **Prune and sharpen**: keep the 37 strong titles, drop 7 weak or duplicate ones, add 3 new ones. 40 total, 10 per field. |
| Option text is still the key, and the client and server copies can drift silently (today a reworded option silently changes results). | That is the existing string-coupling gotcha. | Server owns an option catalog (`server/quiz.js`) keyed by stable ids; a server test imports `client/src/content.js` and fails if the two differ in any character. |
| Old answers: a visitor with an open tab or a saved draft still holds the old option strings. | They would submit text the new mapping does not know. | Server rejects unknown options with a clear 400 ("The questionnaire was updated. Reload and answer again."). The client drops draft answers that are not current options before resuming. Saved results are stored, not recomputed, so they are unaffected. |
| A hard field filter could make results predictable ("I picked finance, I got finance"). | Some of the fun was surprise. | Accept: the field only chooses the shelf of 10; the other four answers pick the title, and the receipts make the surprise feel earned. |
| Balance is not guaranteed by hand-written cues. | Regressions like the 8.8% outlier. | A test bounds every career between 1% and 4% of all 1,024 answer sets, and every career must be reachable. |
| Evidence quoting option text that itself contains quotes reads badly. | "you chose "who?"" is ugly. | Options are written to read well inside quotation marks; no inner quotes. |

## 4. Plan v2 (executed)

**Mapping** (`server/careers.js`, `server/quiz.js`)
- The field answer (question 5) picks the shelf of 10 careers.
- Each career lists two cue answers from questions 1 to 4. Score = number of
  cues the user picked. Highest score wins; a stable FNV hash of all five
  answers breaks ties, so the same answers always give the same career and
  the same cached portrait.
- `mapCareer` also returns `evidence`: the user's matched cue answers, topped
  up with their field answer so there are always two.

**Questions** (`client/src/content.js`), same ids as before:
1. The demo is in ten minutes and the laptop just died. You…
2. Monday, 9:02 a.m. First move?
3. Your coworkers know you as…
4. Where do you see yourself in five years?
5. You have 47 browser tabs open. Mostly…

**Report**: under the filing line, "Evidence on file: “…” and “…”." Stored in
the saved result, so it shows on revisits; older results simply omit it.

**Pool**: dropped the duplicate Freelance Idea Generator, the Sunset
Photographer, Professional Networker, Corporate Optimism Evangelist, Remote
Work Pioneer, Chief Vibes Officer, Comfort Food Therapist and Office Supply
Chain Manager. Added Prompt Engineer Who Says Please to the Chatbot,
Screenwriter Who Has Been on Page 30 Since 2021 and Podcast Host, Listener
Count: Mom. Every salary and outlook line is unique.

**Tests**: every career reachable; each between 1% and 4%; deterministic;
evidence always two current option texts; samples still map to their titles;
client and server option text identical; unknown options rejected.

## 5. Measured result (all 1,024 answer sets)

| | Before | After |
|---|---|---|
| Careers reachable | 44 of 44 | 40 of 40 |
| Most frequent career | 8.8% | 3.6% |
| Least frequent career | 1.5% | 1.8% |
| Result belongs to the chosen field | not guaranteed | always |
| Result backed by at least one specific answer, quoted on the report | never shown | always |
| Changing one answer keeps the same title | 20.7% | 29.1% |

The last row is honest about a limit: with 40 titles over 1,024 answer sets,
most single changes still move the result, and every change of the tabs
answer moves the shelf by design. What changed is that the move is
explained: the report names the answers that decided it.

## 6. Not doing (and why)

- Hebrew version: the audience question in `CLAUDE.md` is still open.
  Everything here is copy in two files, so a translation later is cheap.
- Changing the stats or analysis rows: out of scope; they work.

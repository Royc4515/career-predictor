# Public share page

Status: built (November 2026).

## Why
The Share button used to send the cover PNG and a link to the home page. Whoever received it saw the picture, but not the report (the evidence, the figures, the analysis), which is most of the joke. A shared issue now has its own public page.

## What it is
- `/s/:token` shows one issue: the cover, the headline and caption, the figures, the analysis and the two quoted answers, in the viewer's language, with "Get your own cover".
- Link previews (WhatsApp, LinkedIn, Telegram, X) get the cover and the headline. Their crawlers do not run JavaScript, so the server writes the tags into the page (`GET /s/:token` in `server/routes/shareRoutes.js`): `og:title` ("Roy is on the cover: ...", in the language the link was made in), `og:image` (`/api/share/:token/og.jpg`, the portrait as a 600x750 JPEG) and `noindex`.

## Privacy
- A link exists only when its owner creates one, in the share panel on the result page. Tokens are 72 random bits; nothing lists them.
- The page holds a snapshot made at share time (`shares` table), so a retake does not change a link already sent.
- It shows the first name, the cover, the stats and the two quoted answers. Never the email, the other answers or anything else.
- The owner's own face is on the page only while they have ticked the box for that link (unticked by default; ticking or unticking changes the link already sent, `PATCH /api/user/share/:token`). Otherwise it shows the career's shared portrait. Removing the photo ("Remove my photo from every issue", or deleting the issue it was on) clears it from every link (`db.unlinkSharedPortrait`).
- "Stop sharing" ends every live link of that issue at once (`revoked_at`); an ended link shows "This issue is no longer shared".
- Images served through a link are cached for 5 minutes only, so stopping a share or removing the photo takes effect.
- At most 30 new links per user per day (in memory).

## Flow
Result page, Share: one tap. The browser names the token (`lib/shareLink.js`, 9 random bytes, the server's format), so the native share sheet opens inside the tap with the link already in it while `POST /api/user/share { token }` files it in parallel (idempotent, so a retry is safe). Safari refuses a share that starts after a network wait; this used to need a second tap. Without a share sheet (most desktop browsers) the same tap copies the link. A strip then opens under the buttons and scrolls itself into view: what is public, the link, Copy link, Stop sharing, and the face box when the cover has the owner's portrait. Dismissing the share sheet without sending ends the link made for that tap, so nothing is left public that nobody chose to share. Sharing again in the same session reuses the live link (`shareLinks` in `lib/storage.js`).

## API
- `POST /api/user/share` `{ withFace, lang }` -> `{ url, token, withFace }` (reuses a live link for the same snapshot).
- `DELETE /api/user/share/:token` -> 204.
- `GET /api/share/:token` (public) -> the page's data; 404 when unknown or ended.
- `GET /api/share/:token/image` (public) -> the owner's portrait, only on a link shared with it.
- `GET /api/share/:token/og.jpg` (public) -> the preview image.

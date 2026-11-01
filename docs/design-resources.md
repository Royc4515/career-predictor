# Design resources for working on this project with Claude

Researched November 2026. "Verified" means it was opened, cloned or called
from this repo's session; everything else comes from third-party roundups and
should be checked before installing.

## Skills (instruction sets the agent follows)

| Skill | Source | What it adds | Status |
|---|---|---|---|
| frontend-design | `anthropics/skills`, `skills/frontend-design` | Commit to an aesthetic before coding; list of AI-design tells to avoid | Verified, applied (see `redesign-plan.md` section 5) |
| Web Interface Guidelines | `vercel-labs/agent-skills`, `skills/web-design-guidelines` (rules in `vercel-labs/web-interface-guidelines`) | 100+ concrete rules: focus, forms, motion, touch targets, copy | Verified, used as an audit |
| react-view-transitions | `vercel-labs/agent-skills`, `skills/react-view-transitions` | Correct View Transition patterns for React and routers | Verified, used as an audit |
| Emil Kowalski skills | `emilkowalski/skill` (`improve-animations`, `review-animations`, `find-animation-opportunities`, `animation-performance`, `emil-design-eng`) | Easing, duration and origin rules for interface motion | Verified, used as an audit |
| Impeccable | `pbakaus/impeccable`, site impeccable.style | Brand and product modes, commands such as typeset, colorize, bolder | Verified, used as an audit |
| Taste Skill | `Leonxlnx/taste-skill` | Layout, type, motion and spacing rules with variance and density dials | Verified, used as an audit |
| UI UX Pro Max | various forks | Design-system generator for dashboards and SaaS | Not used: wrong fit for an editorial one-off |
| designer-skills | `Owl-Listener/designer-skills`, `julianoczkowski/designer-skills` | Full process: discovery, brief, IA, tokens, handoff | Not used here |
| accesslint | `accesslint/claude-marketplace` | WCAG contrast and semantics checks | Not used; contrast was computed directly instead |

Install in Claude Code (any of these): `npx skills add <owner>/<repo>` or
`/plugin marketplace add <owner>/<repo>`.

## MCP servers (tools the agent can call)

| Server | Use | Cost |
|---|---|---|
| Figma | Read frames and variables, push code back to Figma | Connected on this account |
| Canva | Marketing graphics, PNG/PDF export | Connected on this account |
| shadcn MCP (`npx shadcn@latest mcp init --client claude`) | Install components from shadcn registries (Magic UI, Aceternity) | Free; needs `components.json` |
| 21st.dev Magic / 21st MCP | Generate single components from prompts | Free tier; keys were reset in 2026 |
| Awwwards (community, `npx -y awwwards-mcp`) | Search award sites, extract palettes, record animations | Free |
| Mobbin (`https://api.mobbin.com/mcp`) | Real app screens and flows for reference | Paid plan |
| Playwright (`npx @playwright/mcp@latest`) | Screenshot at any size, measure overflow, tap targets, contrast | Free; this project already uses Playwright directly |
| Recraft, fal | SVG icons and illustrations; image and video models | Credits |
| Paper, Penpot, Wonder | Design canvases whose output is real HTML/CSS | Free tiers |

## Component and effect libraries

- Motion (`motion.dev`): already the animation layer here.
- Magic UI, Aceternity UI, React Bits: copy-in animated components. Use
  sparingly; most of their hero effects are exactly the generic look the
  frontend-design skill warns about.
- Codrops (tympanus.net/codrops): tutorials for one-off effects (text
  reveals, image transitions, WebGL distortions). Best source when an effect
  should be built for the concept rather than installed.

## Inspiration

- Awwwards, Godly, SiteInspire, Land-book: whole-site galleries.
- Mobbin, Refero: product UI patterns and flows.
- Typewolf, Fonts In Use: real typography pairings.

## Sources

- https://github.com/anthropics/skills/tree/main/skills/frontend-design
- https://composio.dev/content/top-design-skills
- https://www.paralect.com/mcp/top-design-mcp-servers
- https://www.firecrawl.dev/blog/best-claude-code-skills
- https://github.com/21st-dev/magic-mcp

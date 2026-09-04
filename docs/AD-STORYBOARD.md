# Launch film — storyboard

**Not built yet.** This is the plan to approve before rendering. Every shot
below maps to footage that already exists in `docs/screenshots/` and
`docs/media/`, so once the storyline is signed off the render is assembly
work, not another capture session.

- **Length** 62s — long enough for the argument, short enough for a feed.
- **Ratio** 16:9 master at 1920×1080, plus a 1:1 and 9:16 cut for social.
- **Sound** one piano/string bed, no voice-over. All copy is on-screen, so
  it plays silently in a feed and still lands.
- **Type** the product's own faces — the serif for statements, the mono for
  labels. Cream `#F7F3EA` and ink `#1B2A4A`, with the gold `#C9A227` used
  only on the turn.

---

## The storyline

The film is built on one reversal. **Everyone already believes AI can argue.
Nobody believes it can be trusted to cite.** So the first act does not sell
capability — it concedes the objection, out loud, and then answers it.

| # | Time | On screen | Copy | Note |
|---|---|---|---|---|
| 1 | 0–4s | Black. Type fades up. | *"Cite a case that supports us."* | Set in the mono. It reads as an instruction to a machine — and as the thing every lawyer fears being asked. |
| 2 | 4–9s | A turn streams in, then a citation **strikes through** and vanishes. Hold on the empty space. | `"Sharma v. State" — not in the retrieved record.` | The hero moment, and it is a *refusal*. From `01-landing-hero.png`. |
| 3 | 9–13s | Cut to cream. Logo. | **VaadVivaad** · *Your case, argued both ways.* | First and only branding beat until the end. |
| 4 | 13–20s | `01-filing-a-case.gif`, sped to 3×. | *File the matter you actually have.* | Show the evidence chips landing — it reads as work, not a prompt box. |
| 5 | 20–27s | Stage rail from `29-hearing-t012.png`, phases lighting in sequence. | *Opening. Evidence. Rebuttal. Closing.* | Cut each word to a phase lighting up. |
| 6 | 27–38s | `02-hearing-streaming.gif` — the long beat. Let it breathe. | *Two counsel. Four phases. Every citation checked before it is shown.* | The only shot over 8s. Earn it. |
| 7 | 38–44s | Push in on the elements checklist ticking, `31-hearing-final.png`. | *Not a summary. A record.* | Ken Burns, slow. |
| 8 | 44–50s | `44-order-of-the-bench.png`, then the confidence figure. | *A reasoned order — with confidence capped at what the record supports.* | Hold on `0.75`. The restraint is the pitch. |
| 9 | 50–56s | Evidence-gaps panel, the `CRITICAL` chip. | *And an honest account of what is still missing.* | From `31-hearing-final.png`. |
| 10 | 56–62s | Cream. Logo, then the line, then the URL. | *Free and self-hosted. One external service.* → `github.com/Abhi-shekes/Legal-AI-VaadVivaad` | Last frame holds 2s on the URL alone. |

## The disclaimer

A 1.5s card before the final logo, in the mono, small:

> *Not legal advice. A research and drafting aid — every section and authority
> it produces must be checked against the official text.*

Non-negotiable. The product says this on its own landing page, and a launch
film that omits it makes a claim the product refuses to make.

## What still needs deciding

1. **Music.** Needs a track that can carry a 10-second hold at shot 6 without
   filling it. Send me one, or I can cut to a royalty-free bed.
2. **Shot 2.** The strike-through is currently a static frame. It is the most
   important 5 seconds in the film and would be far stronger animated — which
   means a short scripted capture, not a crop.
3. **Voice-over or not.** Written for silent playback. A read would let shots
   4–9 tighten by ~8s.

## Assembly

`ffmpeg` throughout — Ken Burns via `zoompan`, cuts via `concat`, type via
`drawtext` with the project fonts. No external editor, so the film rebuilds
from a script whenever the UI changes. Renders to `docs/media/launch.mp4`
and ships as a GitHub Release asset rather than in git — the repo does not
need a 40 MB binary in its history.

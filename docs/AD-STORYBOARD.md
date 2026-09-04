# Launch film — storyboard

**Not built yet.** Approve the storyline first; the render is then assembly
work, because every frame below already exists in `docs/screenshots/` and
`docs/media/`.

- **Length** 75s · **Master** 1920×1080, with 1:1 and 9:16 cuts
- **Voice-over** yes — the script is below, timed. Copy also appears on
  screen so it survives a muted autoplay feed.
- **Palette** cream `#F7F3EA`, ink `#1B2A4A`, gold `#C9A227` used only on
  the turn.

---

## Structure

| Act | Time | Job |
|---|---|---|
| **1 · Hook** | 0–8s | Earn eight more seconds. |
| **2 · Problem** | 8–24s | Name the thing that makes lawyers distrust AI. |
| **3 · Solution** | 24–40s | The one mechanism that answers it. |
| **4 · Features** | 40–66s | What else it does, fast. |
| **5 · Close** | 66–75s | Name, terms, URL. |

---

## Act 1 · Hook (0–8s)

| Time | Shot | Voice-over | On screen |
|---|---|---|---|
| 0–4s | Black. Mono type appears one character at a time, cursor blinking. | *(silence — let it type)* | `"Cite a case that supports us."` |
| 4–8s | A turn streams in. A citation appears — then **strikes through and vanishes**. Hold on the gap. | "Every lawyer has asked for this. Almost none of them trust the answer." | `"Sharma v. State" — not in the retrieved record` |

The hook is a **refusal**, not a capability. Source: `01-landing-hero.png`.

## Act 2 · Problem (8–24s)

| Time | Shot | Voice-over | On screen |
|---|---|---|---|
| 8–14s | Slow push on the struck-out citation, now blurred behind type. | "Ask a language model for authority that helps your case, and it will give you some. Confidently. Whether or not it exists." | **It will invent the citation.** |
| 14–19s | Cut to cream. Three lines set in the serif, each landing on a beat. | "So you check it. Then you check the next one. And the one after that." | *Every citation · checked by hand · every time* |
| 19–24s | Hold on black. One line. | "The research was never the slow part. The verification was." | **Verification is the bottleneck.** |

This is the act that earns the product. It sells nothing.

## Act 3 · Solution (24–40s)

| Time | Shot | Voice-over | On screen |
|---|---|---|---|
| 24–28s | Cream. Logo resolves. | "VaadVivaad." | **VaadVivaad** · *Your case, argued both ways.* |
| 28–34s | `02-hearing-streaming.gif` — prosecution, then defence. | "Two counsel argue your matter across four phases — opening, evidence, rebuttal, closing." | `OPENING · EVIDENCE · REBUTTAL · CLOSING` |
| 34–40s | Push in as a citation is checked, then the strike-through **from Act 1 replays** — now understood. | "And counsel may only cite from authority actually retrieved for your case. Anything else is stripped before the turn is ever shown to you." | **Checked before it reaches you.** |

The callback is the hinge of the film. The audience saw this exact frame at
0:06 as a failure; at 0:36 they see it was the product working.

## Act 4 · Features (40–66s)

Faster cuts, ~4s each. VO carries; type is a single label per shot.

| Time | Shot | Voice-over | Label |
|---|---|---|---|
| 40–44s | `01-filing-a-case.gif`, 3× | "File the matter you actually hold — typed, dictated, or as an FIR." | *File it* |
| 44–48s | `31-hearing-final.png`, push on the elements checklist | "Watch the elements of the offence tick off as counsel speak to them." | *Elements, tracked* |
| 48–52s | Statute strip, `s.420 ≈ BNS 318(4)` | "Routed between the Penal Code and the Sanhita by the date of the incident." | *IPC ↔ BNS* |
| 52–57s | `44-order-of-the-bench.png`, hold on `0.75` | "A reasoned order — with its confidence capped at what the record can actually support." | *Confidence, capped* |
| 57–61s | Evidence-gaps panel, `CRITICAL` chip | "And an honest account of what is still missing, and who would obtain it." | *Gaps, named* |
| 61–66s | `23-command-palette-search.png` → `63-grafana-overview.png` | "Every hearing searchable, exportable, and yours — self-hosted, on free parts." | *Self-hosted* |

## Act 5 · Close (66–75s)

| Time | Shot | Voice-over | On screen |
|---|---|---|---|
| 66–70s | Cream. The disclaimer, mono, small. | "It is not legal advice. It is a faster way to see the argument against you." | *A research and drafting aid. Every section and authority must be checked against the official text.* |
| 70–75s | Logo, then URL alone for the last 2s. | *(silence)* | `github.com/Abhi-shekes/Legal-AI-VaadVivaad` |

The disclaimer is non-negotiable — the product says it on its own landing
page, and a film that omits it makes a claim the product refuses to make.

---

## Word count

VO is ~150 words over 75s ≈ 120 wpm — deliberately under conversational pace.
The film should feel like it has time.

## Can this be rendered here?

Yes, with one caveat and one gap. See the "Tooling" section of the handover
notes — short version: `ffmpeg` has `zoompan`, `drawtext` and `libx264`, so
Ken Burns, titles and the master render are all fine; it lacks `xfade`, so
transitions are dip-to-black rather than crossfades (a hard cut is the right
grammar for this film anyway). Voice-over can be generated locally with the
Piper container already running. **Music is the gap** — no licensed track is
available here, and one must be supplied.

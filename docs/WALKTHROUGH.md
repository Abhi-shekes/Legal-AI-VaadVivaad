# VaadVivaad — a walkthrough

Every screen in the application, captured against a live stack: five core
containers plus the `retrieval`, `search`, `websearch`, `voice` and
`observability` profiles, a corpus of 12 verified authorities, and Gemini
answering for real.

The matter used throughout is a cheating and forgery case — an accused who
took ₹18,50,000 for a flat against a forged municipal sanction plan, and who
says the money was a civil loan. It engages **IPC 420** with **s.467, s.468
and s.471** also disclosed, and the incident predates 1 July 2024, so the
Penal Code applies and the BNS counterpart is shown alongside it.

---

## 1. The landing page

| | |
|---|---|
| ![](screenshots/01-landing-hero.png) | ![](screenshots/03-landing-scroll-900.png) |
| The hero, with a specimen exchange — note the struck-through citation: an authority the model reached for that was not in the retrieved record, removed before the turn was shown. | The claim the whole system is built to keep. |

| | |
|---|---|
| ![](screenshots/05-landing-scroll-2700.png) | ![](screenshots/07-landing-scroll-4500.png) |
| How a hearing runs, as a pipeline. | The capability profiles, and what each one costs. |

## 2. Signing in

| | |
|---|---|
| ![](screenshots/10-login.png) | ![](screenshots/11-signup.png) |
| Sign in. | Create an account — with a live password-strength meter. |

## 3. The Docket

![](screenshots/16-docket.png)

Matters filed, what is in flight, which way the bench has leaned across every
hearing, and the median confidence those orders carried. The right rail
tracks the sections you keep hitting.

| | |
|---|---|
| ![](screenshots/19-docket-concluded.png) | ![](screenshots/21-docket-section-facet.png) |
| Filtered to concluded matters. | Faceted by section. |

| | |
|---|---|
| ![](screenshots/22-command-palette.png) | ![](screenshots/23-command-palette-search.png) |
| `⌘K` from anywhere. | Meilisearch reaching *into the transcript* — this matched text inside counsel's opening, not just the case title. |

## 4. Filing a matter

![](media/01-filing-a-case.gif)

| | |
|---|---|
| ![](screenshots/24-intake-empty.png) | ![](screenshots/27-intake-evidence.png) |
| Describe it, upload a document, start from a template, or dictate it. | Evidence itemised as chips — the readiness meter responds to what you actually hold. |

## 5. The hearing

![](media/02-hearing-streaming.gif)

![](screenshots/29-hearing-t012.png)

The stage rail runs **opening → structure → retrieval → argument → ruling →
audit → concluded**, and the bar along the bottom stays live throughout: you
can object mid-hearing and the affected counsel must address it.

![](screenshots/31-hearing-final.png)

The provision engaged, its BNS counterpart, the elements to prove ticked off
as counsel speak to them, and — on the right — evidence gaps graded
**critical** or **material** while the hearing is still running.

> Both `ROUND 4 · CLOSING` turns are present. Until the fix in this release
> they were not: a 503 from the model provider silently dropped the defence's
> closing and the hearing reached its order with counsel's last word missing.

## 6. The order, and the audit

![](media/03-order-and-audit.gif)

| | |
|---|---|
| ![](screenshots/44-order-of-the-bench.png) | ![](screenshots/41-consult-answer.png) |
| The order — a decisive issue, findings resolved one by one, and a confidence **capped at what the record supports**. | Put a question to the bench or to either counsel; the answer is kept on the record. |

| | |
|---|---|
| ![](screenshots/42-take-a-side.png) | ![](screenshots/43-translate-menu.png) |
| Argue it yourself and be scored against the same record. | The whole hearing in 12 Indian languages. |

## 7. The case record

| | |
|---|---|
| ![](screenshots/53-record-0.png) | ![](screenshots/59-outside-record.png) |
| A concluded matter opens as a record rather than a live hearing. | *Outside the record* — live web leads from SearXNG. Never citable, never `Precedent`, never in the debate context. |

| | |
|---|---|
| ![](screenshots/60-case-file.png) | ![](screenshots/52-statute-popover.png) |
| Add an FIR or a chargesheet and its passages are read into the argument. | The bare provision, on demand. |

## 8. Dark theme

| | |
|---|---|
| ![](screenshots/45-docket-dark.png) | ![](screenshots/46-hearing-dark.png) |
| The Docket. | The hearing. |

## 9. Operations

![](screenshots/63-grafana-overview.png)

Hearings done and failed, citations stripped, circuit trips, rate-limit
blocks, corpus size, token spend by step, model latency, scope-guard mix and
turns by phase — provisioned automatically with
`docker compose --profile observability up -d`.

| | |
|---|---|
| ![](screenshots/65-prometheus-targets.png) | ![](screenshots/67-swagger.png) |
| Prometheus scrape targets. | The API at `/docs`. |

---

## Everything captured

<details><summary>All 64 screenshots</summary>

- `01-landing-hero` — ![](screenshots/01-landing-hero.png)
- `02-landing-full` — ![](screenshots/02-landing-full.png)
- `03-landing-scroll-900` — ![](screenshots/03-landing-scroll-900.png)
- `04-landing-scroll-1800` — ![](screenshots/04-landing-scroll-1800.png)
- `05-landing-scroll-2700` — ![](screenshots/05-landing-scroll-2700.png)
- `06-landing-scroll-3600` — ![](screenshots/06-landing-scroll-3600.png)
- `07-landing-scroll-4500` — ![](screenshots/07-landing-scroll-4500.png)
- `08-landing-scroll-5400` — ![](screenshots/08-landing-scroll-5400.png)
- `09-landing-scroll-6300` — ![](screenshots/09-landing-scroll-6300.png)
- `10-login` — ![](screenshots/10-login.png)
- `11-signup` — ![](screenshots/11-signup.png)
- `12-contact` — ![](screenshots/12-contact.png)
- `13-terms` — ![](screenshots/13-terms.png)
- `14-privacy` — ![](screenshots/14-privacy.png)
- `15-404` — ![](screenshots/15-404.png)
- `16-docket` — ![](screenshots/16-docket.png)
- `17-docket-full` — ![](screenshots/17-docket-full.png)
- `18-docket-grid` — ![](screenshots/18-docket-grid.png)
- `19-docket-concluded` — ![](screenshots/19-docket-concluded.png)
- `20-docket-inflight` — ![](screenshots/20-docket-inflight.png)
- `21-docket-section-facet` — ![](screenshots/21-docket-section-facet.png)
- `22-command-palette` — ![](screenshots/22-command-palette.png)
- `23-command-palette-search` — ![](screenshots/23-command-palette-search.png)
- `24-intake-empty` — ![](screenshots/24-intake-empty.png)
- `25-intake-full` — ![](screenshots/25-intake-full.png)
- `26-intake-described` — ![](screenshots/26-intake-described.png)
- `27-intake-evidence` — ![](screenshots/27-intake-evidence.png)
- `28-intake-ready` — ![](screenshots/28-intake-ready.png)
- `29-hearing-t012` — ![](screenshots/29-hearing-t012.png)
- `30-hearing-t062` — ![](screenshots/30-hearing-t062.png)
- `31-hearing-final` — ![](screenshots/31-hearing-final.png)
- `32-hearing-full` — ![](screenshots/32-hearing-full.png)
- `33-case-scroll-0` — ![](screenshots/33-case-scroll-0.png)
- `34-case-scroll-700` — ![](screenshots/34-case-scroll-700.png)
- `35-case-scroll-1400` — ![](screenshots/35-case-scroll-1400.png)
- `36-case-scroll-2100` — ![](screenshots/36-case-scroll-2100.png)
- `37-case-scroll-2800` — ![](screenshots/37-case-scroll-2800.png)
- `38-case-scroll-3500` — ![](screenshots/38-case-scroll-3500.png)
- `39-case-scroll-4200` — ![](screenshots/39-case-scroll-4200.png)
- `40-consult-compose` — ![](screenshots/40-consult-compose.png)
- `41-consult-answer` — ![](screenshots/41-consult-answer.png)
- `42-take-a-side` — ![](screenshots/42-take-a-side.png)
- `43-translate-menu` — ![](screenshots/43-translate-menu.png)
- `44-order-of-the-bench` — ![](screenshots/44-order-of-the-bench.png)
- `45-docket-dark` — ![](screenshots/45-docket-dark.png)
- `46-hearing-dark` — ![](screenshots/46-hearing-dark.png)
- `47-landing-dark` — ![](screenshots/47-landing-dark.png)
- `52-statute-popover` — ![](screenshots/52-statute-popover.png)
- `53-record-0` — ![](screenshots/53-record-0.png)
- `54-record-800` — ![](screenshots/54-record-800.png)
- `55-record-1600` — ![](screenshots/55-record-1600.png)
- `56-record-2400` — ![](screenshots/56-record-2400.png)
- `57-record-3200` — ![](screenshots/57-record-3200.png)
- `58-record-4000` — ![](screenshots/58-record-4000.png)
- `59-outside-record` — ![](screenshots/59-outside-record.png)
- `60-case-file` — ![](screenshots/60-case-file.png)
- `61-grafana-login` — ![](screenshots/61-grafana-login.png)
- `62-grafana-dashboards` — ![](screenshots/62-grafana-dashboards.png)
- `63-grafana-overview` — ![](screenshots/63-grafana-overview.png)
- `64-grafana-panels` — ![](screenshots/64-grafana-panels.png)
- `65-prometheus-targets` — ![](screenshots/65-prometheus-targets.png)
- `66-prometheus-query` — ![](screenshots/66-prometheus-query.png)
- `67-swagger` — ![](screenshots/67-swagger.png)
- `68-swagger-routes` — ![](screenshots/68-swagger-routes.png)

</details>

## How these were produced

Playwright driving Chromium at 1600×1000, `device_scale_factor=2`, then
downscaled and quantised — a README should not cost 30 MB of PNG to open.
Video was recorded by the same browser context and cut with ffmpeg. Nothing
here is a mockup: every frame is the running application answering a real
Gemini call against a real corpus.

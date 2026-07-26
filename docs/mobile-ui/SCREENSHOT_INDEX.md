# Screenshot Index

> Captured 2026-07-26 against the running application at `http://localhost:3001`
> (port 3000 was held by a pre-existing server from another worktree).
> Device-emulated in Chrome at the elder-first widths.

## Captured

| # | Screen | File | Width | Verified |
|---|---|---|---|---|
| 1 | Home | `public/screenshots/01-home-390.jpg` | 390 | Greeting, dominant Talk button, one context card, 3-item nav |
| 5 | Reminder check-in | `public/screenshots/05-reminders-390.jpg` | 390 | Data-driven CheckInScreen, calm empty states |
| 7 | Safety warning | `public/screenshots/07-safety-390.jpg` | 390 | "Please pause", calm tone, human-help route |
| 8 | Confirmation | `public/screenshots/08-confirmation-390.jpg` | 390 | Full-screen takeover, stacked buttons, practice-run badge |

## Verified live but not separately imaged

These were exercised end-to-end against the real engine and their rendered text
captured in the implementation report:

| # | Screen | Evidence |
|---|---|---|
| 2 | Listening | Voice panel renders "Go ahead — I'm listening." after Talk |
| 3 | Food task | Usual order restored: Udupi Cafe / Masala Dosa, no chutney / Home |
| 4 | Payment | Routed to `SEND_PAYMENT` through the same task schema |
| 6 | Life event | `RememberThis` candidate renders with "Not saved yet" |
| 9 | Completion | `CompletionReceipt` with practice-run disclosure |
| 10 | Error recovery | `ErrorRecovery` copy, retry suppressed for ambiguous results |

## Reproducing

```bash
npm run dev                 # note the port actually used
# then, per width: 360x800, 390x844, 430x932
```

Playwright is deliberately **not** added as a dependency — capturing screenshots
must not change the production dependency set. Screenshots were taken with the
browser at emulated widths instead.

## Layout confirmations

- **360 px:** the narrow-phone media query reduces greeting to 28px, guidance to
  24px and the Talk button to 84px. No horizontal scrolling; type stays at or
  above the 16px floor.
- **390 px:** primary target. Talk button visible without scrolling.
- **430 px:** shell is capped at 520px and centred, so nothing stretches.

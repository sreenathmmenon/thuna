# Life Events Demo Script

## Setup

1. Start the Thuna product and choose **My life**.
2. Keep the Demo Inspector available for showing deterministic state and fallback status.
3. Use typed input if microphone access or Saaras is unavailable.

## Wedding invitation

1. Open **Remember this**.
2. Say or type:

   > Meera and Arun wedding at Guruvayur on 2026-08-09

3. Point out `CANDIDATE · NOT SAVED` and read the extracted date, people, and venue.
4. Change only the date to `2026-08-10`.
5. Verify the people and venue remain unchanged and the read-back changes only the date.
6. Choose **Yes, save this**.
7. Open **Upcoming events** and show:

   - source provenance;
   - elder-confirmed state;
   - three scheduled reminders;
   - the **Correct event** control, which supersedes the earlier record and cancels stale reminders.

## Bill reminder

1. Return to **Remember this** and choose **Bill reminder**, or type:

   > Electricity bill Rs 840 due 2026-08-01

2. Ask Thuna to read it back, then explicitly save it.
3. Open **Upcoming events** and show the three-day and due-day reminder policy.
4. Explain that no payment action exists.
5. Leave the confirmation blank in an API or test demonstration and show that the bill stays open.
6. In the UI, choose **Yes, I paid it** to demonstrate explicit paid confirmation.

## Pending promises

1. Save **Remind me after dinner** and confirm the read-back.
2. Save **Continue Wi-Fi tomorrow** and confirm the read-back.
3. Open **Pending promises**.
4. Snooze one promise for ten minutes.
5. Explicitly complete it with **Yes, completed**.
6. Explain that silence never completes a promise and that every transition remains in history.

## Daily brief

1. Open **Daily brief** and choose **Prepare my brief**.
2. Show that the brief combines confirmed events, bills, routines, family commitments, and pending
   promises.
3. Point out that equivalent items appear once, urgent bills rank ahead of lower-priority items,
   and only three are spoken at once.
4. Explain that scheduled briefs are off by default and defer during quiet hours. This brief is
   allowed because the elder requested it now.

## Family attention

1. Open **Ask family**.
2. Turn on **Family-content permission** for Sree. This records explicit consent history.
3. Enter:

   > Please ask Sree to call me about the wedding.

4. Choose **Request family attention**. Emphasize that nothing has been sent.
5. Choose **Offer to Sree**. The existing notification adapter receives only:

   > Appa asked Sree to follow up.

6. Advance the simulated lifecycle through accepted, scheduled, and completed.
7. Choose **Yes, Sree helped**. Only this elder response produces `ELDER_CONFIRMED`.

## Interruption and phone continuity

Explain the contract-level scenario:

1. A web interaction pauses after some fields are confirmed.
2. Thuna preserves those fields, the pending question, and the next safe step.
3. A phone-interface resume requires Thuna to read the state back again.
4. Any previous confirmation is stale and cannot authorize a later action.

No outbound call is made in this release.

## Closing safety statement

The life-event and companion flows add no live provider actions. Sarvam voice remains the real
browser voice path when configured; food, payments, tracking, family notification fallback, and
other provider actions remain explicitly simulated, while telephony is interface-only.

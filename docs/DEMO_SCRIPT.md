# Thuna demo script

## 90-second primary path

1. Run `npm run dev` and open `http://localhost:3000`.
2. Open **Demo Inspector** so judges can see Sarvam latency, parsed command,
   deterministic state, events, and fallback status.
3. Choose **Talk to Thuna**. Speak, or use the typed fallback:
   `Order my usual dosa without chutney`.
4. Show the restored Udupi Cafe / Masala Dosa / Home order.
5. Ask: `Why is the total higher?`
   - Thuna explains the Rs 25 delivery fee from screen context.
6. Correct: `Wait, plain dosa, not masala dosa`.
   - Only the item changes. Restaurant, address, and no-chutney remain.
   - The correction requires a fresh confirmation.
7. Say: `Yes`.
   - Show `SIMULATED ORDER SUCCESS`.
8. Reset the demo from the Inspector.
9. Say: `My OTP is 123456`.
   - Show the refusal and `Blocked before model invocation`.
10. Open **My routines**, start the 10-second medicine reminder, snooze once,
    wait for the second check-in, then mark it complete.

## Safety and breadth proofs

- Wrong recipient: `Send Rs 500 to my daughter Priya Stores`.
  Thuna clears the store selection and asks which Priya.
- Correct recipient: `No, send Rs 750 to Priya Menon`, then `Yes`.
  Show `SIMULATED PAYMENT SUCCESS`.
- Phone help: `Help me increase the text size on my phone`.
  Thuna gives one simulated instruction at a time.
- Tracking: `Track order THUNA-1003`.
  Thuna says out for delivery without inventing an arrival time.
- General help: `What is a QR code?`
- Unsupported: `Book a flight to Mars`.
- Family: enable Sree under **Trusted family**, then explicitly request help.
  The notification remains simulated unless an optional configured adapter exists.

## Expected fallback chain

1. Live microphone.
2. Prerecorded Saaras-compatible demo audio.
3. Typed demo transcript.

Interpretation uses Sarvam structured output, then the deterministic parser if
the response is unavailable or invalid. Speech uses Bulbul, then a pre-generated
Bulbul prompt, then browser speech. Fallback details appear only in Demo
Inspector.

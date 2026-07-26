# Railway Post-Merge Checklist — Thuna

## IMPORTANT
The current deployment reflects the **main repository at commit `57984f4`** (Codex continuity integration) **plus Railway deploy-prep changes**. It does **not** include:
- Claude's final mobile UI commit, and
- Codex's real Swiggy integration commit.

**The final deployment MUST be redeployed after those commits are merged into:**
`/Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26`

## Exact commands to run after the merge
```bash
cd /Users/sreenath/Code/myAIExps/Sarvam-Buildathon-July26
git status
npx tsc --noEmit
npm test
npm run build
railway status
railway up -y -d
```

## Post-redeploy validation
1. `curl -i https://thuna-production.up.railway.app/api/health` → 200.
2. Open `https://thuna-production.up.railway.app` → mobile UI (390×844) loads.
3. Run one live Saaras transcription + one Sarvam interpretation + one Bulbul response.
4. Complete one safe Thuna flow; verify OTP/PIN/CVV refusal still fires.
5. Create a reminder/life event, reload, verify it persists across restart.
6. Confirm simulated actions are labelled and `THUNA_ENABLE_REAL_SWIGGY_ORDER=false` (no real order).

## Safety reminders
- Do NOT place a real Swiggy order.
- Do NOT disable OTP/PIN/CVV refusal.
- Keep replicas at 1 until storage moves to a transactional DB.

# Swiggy localhost connection runbook

## Configuration

Copy `.env.example` to `.env` and set:

```text
THUNA_FOOD_ADAPTER=swiggy
THUNA_ENABLE_REAL_SWIGGY_ORDER=false
THUNA_SWIGGY_CALLBACK_URL=http://localhost:3000/api/integrations/swiggy/callback
THUNA_DATA_ROOT=./data
```

Start Thuna with `npm run dev`, open `http://localhost:3000`, choose Order food and press **Connect Swiggy**.

Swiggy authentication uses OAuth 2.1 with PKCE and Dynamic Client Registration when the discovered metadata supports it. Enter the phone number and OTP only on Swiggy’s authorization page. The exact localhost redirect must match the registered callback.

After the callback, Thuna should say **Swiggy is connected** and load saved addresses. Tokens are server-side only. Current Swiggy documentation describes access tokens as five-day credentials and says refresh tokens are not wired for the current release; a 401 or expiry therefore changes the UI to **Please reconnect Swiggy**.

To disconnect, use the integration API’s `DISCONNECT` action. It attempts the official logout endpoint and always removes the local credential file.

## Recovery

- State mismatch: start Connect Swiggy again. The callback is rejected.
- Expired or 401 session: reconnect; Thuna does not fall back to mock automatically.
- Network ambiguity: retry read-only discovery manually. Thuna never retries order placement.
- Callback mismatch: change `THUNA_SWIGGY_CALLBACK_URL`, remove `data/private/swiggy-oauth.json`, restart and reconnect.

Sources: [Swiggy developer quickstart](https://mcp.swiggy.com/builders/docs/start/developer/) and [Swiggy authentication](https://mcp.swiggy.com/builders/docs/start/authenticate/).

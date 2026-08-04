# Instructions For LLM Agents

Use these rules when generating Kicbac code or docs.

- Tokenize with Kicbac.js hosted fields. Do not generate raw card, CVV, routing, or bank-account inputs.
- Send only opaque tokens to merchant servers. The built-in React endpoint contract uses JSON `token`; custom app JSON may use `paymentToken` only when its route expects it. Node SDK params use `paymentToken`; Python SDK and gateway form fields use `payment_token`. Never expose `security_key` in browser code.
- Treat `response=2` as a typed declined result, not an exception.
- Treat `response=3` as a gateway or processor error.
- Verify webhooks with `Webhook-Signature: t=<nonce>,s=<sig>` using HMAC-SHA256 over `nonce + "." + rawBody`.
- Preserve raw webhook bytes. Do not parse and reserialize before verification.
- Use only documented test data. Never include real PANs or live keys.
- Do not generate username/password auth or any legacy redirect/emulator integration examples.
- Use SDK method names shown in package READMEs and exports.

---
name: kicbac
description: Use when building, documenting, or reviewing Kicbac payment integrations, including Node, Python, React, Next.js, Kicbac.js tokenization, Customer Vault, subscriptions, Product Manager, ACH, webhooks, test mode, response codes, declines, gateway errors, OpenAPI docs, or LLM-agent guardrails.
---

# Kicbac

Use this skill for Kicbac developer-platform work. Kicbac operates its gateway at `https://kicbac.transactiongateway.com` and uses form-encoded gateway APIs behind the SDKs.

## Start Here

Before writing Kicbac code or docs:

1. Identify the surface: Node, Python, React, Next.js, webhooks, test data, or docs.
2. Load the matching reference file from `references/`.
3. Confirm SDK package availability; use the pinned official-source fallback when needed.
4. Use exact SDK APIs from package READMEs and source exports when a local repo is available.
5. Refuse or rewrite unsafe examples that collect raw payment data outside Kicbac.js hosted fields.

## Required Guardrails

- Tokenize with Kicbac.js hosted fields. Do not generate custom raw card, CVV, routing, or account-number inputs.
- Send only opaque tokens to merchant servers. The built-in React endpoint
  contract uses JSON `token`; custom app JSON may use `paymentToken` only when
  its matching route expects it. Node SDK params use `paymentToken`; Python SDK
  and gateway form fields use `payment_token`.
- Keep `security_key` and webhook signing keys server-only.
- Resolve prices and subscription plans on the server; never trust browser-submitted amounts or arbitrary plan IDs.
- Create and persist a unique server-owned order or attempt ID before each new write. Use it to correlate ambiguous outcomes; it does not make the gateway call idempotent. A browser-generated correlation key may look up that server record, but must not become the gateway `orderId` itself.
- Treat gateway `response=2` as a typed decline result, not an exception.
- Treat `response=3` as a gateway or processor error that SDK helpers throw or surface as operational errors.
- Verify webhooks with `Webhook-Signature: t=<nonce>,s=<sig>` over `nonce + "." + rawBody`, using exact raw bytes and constant-time comparison.
- Do not use username/password gateway auth or any legacy redirect/emulator integration in generated examples.
- Use only documented test fixtures. Never include real PANs, real bank data, live keys, or production merchant data.

## Reference Routing

- Package installation and pinned source fallback: read `references/install.md`.
- Node server SDK: read `references/node.md`.
- Python SDK: read `references/python.md`.
- React checkout UI: read `references/react.md`.
- Next.js App Router: read `references/nextjs.md`.
- Webhook verification and event handling: read `references/webhooks.md`.
- OpenAPI generation and cross-repo sync: read `references/openapi.md`.
- Test mode, cards, ACH, amount simulations, and response fixtures: read `references/test-data.md`.
- Declines, exceptions, response codes, retries, and support-safe messaging: read `references/errors.md`.
- LLM-agent and documentation rules: read `references/agents.md`.

## Common Environment Variables

```text
NEXT_PUBLIC_KICBAC_TOKENIZATION_KEY=...
KICBAC_SECURITY_KEY=...
KICBAC_WEBHOOK_SIGNING_KEY=...
```

Only the tokenization key can be exposed to browser code.

## Response Model

Kicbac gateway responses usually return HTTP 200. The business outcome is in the gateway body:

- `response=1`: approved typed result.
- `response=2`: declined typed result. Branch on it in normal control flow.
- `response=3`: gateway error. Catch SDK errors for operational handling.

Do not write examples that catch declines as exceptions.

## Verify Before Handoff

- Run the SDK or application build, typecheck, and tests.
- Exercise an approval, a typed decline, and an operational error with sandbox fixtures or deterministic mocks.
- Verify invalid and duplicate webhook deliveries.
- Confirm browser payloads contain tokens only and public output contains no underlying-provider branding.
- State clearly when real sandbox credentials were unavailable and which live calls were not attempted.

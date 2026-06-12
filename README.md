# Kicbac skill

All-in-one Codex skill for building, documenting, and reviewing Kicbac payment integrations safely.

The skill gives agents compact routing instructions plus focused references for:

- Node SDK usage
- Python SDK usage
- React checkout UI
- Next.js App Router handlers
- Webhook verification
- Test mode and response fixtures
- Declines, gateway errors, retries, and LLM guardrails

## Install

```sh
npx skills add 00-Aakash-00/kicbac-skill
```

Then ask an agent to use `$kicbac` when working on Kicbac integrations.

## Core rules

- Tokenize with Collect.js or Kicbac hosted fields.
- Send only `payment_token` to merchant servers.
- Keep `security_key` and webhook signing keys server-only.
- Treat `response=2` as a typed decline result, not an exception.
- Verify webhooks with `Webhook-Signature: t=<nonce>,s=<sig>` over `nonce + "." + rawBody`.
- Use documented sandbox fixtures only.

## Validate

```sh
python3 /Users/aakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py .
npx skills add . --list --full-depth
```

The first command validates local skill structure in this development environment. The second confirms the skills installer can discover the skill from the repository root.

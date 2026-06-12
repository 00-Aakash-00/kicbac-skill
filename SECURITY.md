# Security policy

This skill is designed to prevent unsafe payment examples.

## Report a problem

Report ordinary documentation issues as GitHub issues. Report leaked credentials, unsafe payment-data handling, or incorrect webhook verification guidance privately to the Kicbac maintainers.

## Rules

- Do not add examples that collect raw PAN, CVV, routing, or account numbers.
- Do not include live Kicbac keys or webhook signing keys.
- Do not document legacy gateway auth or deprecated redirect flows as recommended paths.
- Keep webhook verification guidance aligned to `Webhook-Signature: t=<nonce>,s=<sig>` and exact raw bytes.

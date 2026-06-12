# Test Data

Use only public fixtures from Kicbac repositories:

- `openapi/data/test-cards.json`
- `openapi/data/amount-simulation.json`
- `openapi/data/response-codes.json`
- `openapi/webhooks/vectors.json`

Mark all test data as sandbox-only.

## Token Placeholders

Prefer opaque placeholders in server examples:

```text
tok_test_visa_approved
payment_token_from_collectjs
```

## Amount Simulations

In test mode:

- Amounts `>= 1.00` approve.
- Amounts `< 1.00` decline.

Use those simulations for examples that need approved and declined results.

## Declines

When documenting declines, show the typed result path:

```ts
if (!result.ok) {
  return Response.json(
    { ok: false, message: result.message },
    { status: 402 },
  );
}
```

Do not catch declines as exceptions.

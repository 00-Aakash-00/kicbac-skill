# Test Data

Use only public fixtures from Kicbac repositories:

- Canonical data files:
  `https://github.com/00-Aakash-00/kicbac-js/tree/main/openapi/data`
- Canonical webhook vectors:
  `https://github.com/00-Aakash-00/kicbac-js/blob/main/openapi/webhooks/vectors.json`

Mark all test data as sandbox-only.

## Sandbox Tokens

Use these public documented Kicbac.js test tokens in sandbox examples:

```text
Card token: 00000000-000000-000000-000000000000
ACH token:  11111111-111111-111111-111111111111
```

Prefer opaque placeholders such as `payment_token_from_kicbac_js` when the
exact sandbox token is not material to the example.

## Amount Simulations

In test mode:

| Amount | Gateway response | Response code | Use |
| --- | --- | --- | --- |
| `1.00` | approved (`response=1`) | `100` | Minimum approval |
| `49.99` | approved (`response=1`) | `100` | Typical approval |
| `0.99` | declined (`response=2`) | `200` | Decline path |
| `0.05` | declined (`response=2`) | `200` | Decline path |

Use those simulations for examples that need approved and declined results.
For an existing-plan subscription test, provision a separate sandbox-only plan
with amount `0.99` to exercise the typed decline path; do not change a live plan
or recreate plans inside checkout requests.

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

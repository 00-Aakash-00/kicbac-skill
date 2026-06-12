# Errors And Declines

Kicbac/NMI gateway responses encode the business result in `response`:

- `1`: approved.
- `2`: declined.
- `3`: gateway error.

Declines are recoverable user outcomes and should be returned as typed results. Gateway errors indicate request, configuration, processor, or service problems and are surfaced as exceptions or operational errors by SDK helpers.

## Node Pattern

```ts
try {
  const result = await kicbac.transactions.sale({
    amount: "49.99",
    paymentToken: token,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return { ok: true, transactionId: result.transactionId };
} catch (error) {
  return { ok: false, message: "Payment service unavailable" };
}
```

The `if (!result.ok)` block is the decline path. The `catch` block is for operational errors.

## Python Pattern

```py
try:
    result = client.transactions.sale(amount="49.99", payment_token=token)
except APIError:
    return {"ok": False, "message": "Payment service unavailable"}

if not result.ok:
    return {"ok": False, "message": result.response_text}

return {"ok": True, "transaction_id": result.transaction_id}
```

## Retry Boundary

Do not automatically retry sent `transact.php` POSTs. They are not idempotent. Query the gateway and reconcile before repeating a payment attempt.

`query.php` operations can be retried because they do not create new payment attempts.

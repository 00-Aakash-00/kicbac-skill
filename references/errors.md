# Errors And Declines

Kicbac gateway responses encode the business result in `response`:

- `1`: approved.
- `2`: declined.
- `3`: gateway error.

Declines are recoverable user outcomes and should be returned as typed results. Gateway errors indicate request, configuration, processor, or service problems and are surfaced as exceptions or operational errors by SDK helpers.

## Node Pattern

```ts
// @snippet-check
import { Kicbac } from "kicbac";

const kicbac = new Kicbac({ securityKey: "test_security_key" });

export async function charge(paymentToken: string, orderId: string) {
  try {
    const result = await kicbac.transactions.sale({
      amount: "49.99",
      paymentToken,
      orderId,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    if (!result.transactionId) {
      return {
        ok: false,
        unconfirmed: true,
        message: "Approval received without a transaction ID; reconcile before retrying",
      };
    }

    return { ok: true, transactionId: result.transactionId };
  } catch {
    return {
      ok: false,
      unconfirmed: true,
      message: "Outcome unconfirmed; reconcile by order ID before retrying",
    };
  }
}
```

The `if (!result.ok)` block is the decline path. The `catch` block is for operational errors.

## Python Pattern

```py
# @snippet-check
from kicbac import Kicbac
from kicbac.errors import APIError

client = Kicbac(security_key="test_security_key")

def charge(payment_token: str, order_id: str) -> dict[str, object]:
    try:
        result = client.transactions.sale(
            amount="49.99",
            payment_token=payment_token,
            order_id=order_id,
        )
    except APIError:
        return {
            "ok": False,
            "unconfirmed": True,
            "message": "Outcome unconfirmed; reconcile by order ID before retrying",
        }

    if not result.ok:
        return {"ok": False, "message": result.message}

    if not result.transaction_id:
        return {
            "ok": False,
            "unconfirmed": True,
            "message": "Approval received without a transaction ID; reconcile before retrying",
        }

    return {"ok": True, "transaction_id": result.transaction_id}
```

Generate and persist `orderId` or `order_id` on the server before either call.
The catch path is ambiguous, so keep the attempt blocked and reconcile that ID
instead of automatically retrying.

## Retry Boundary

Do not automatically retry sent `transact.php` POSTs. They are not idempotent. Query the gateway and reconcile before repeating a payment attempt.

`query.php` operations can be retried because they do not create new payment attempts.

## Reconcile By Server Order ID

Query with the server-owned order ID persisted before the write:

```ts
// @snippet-check
import { Kicbac, type XmlRecord } from "kicbac";

export async function queryNodeAttempt(orderId: string): Promise<XmlRecord[]> {
  const kicbac = new Kicbac({ securityKey: "test_security_key" });
  const matches: XmlRecord[] = [];
  for await (const transaction of kicbac.query.transactions({ orderId })) {
    matches.push(transaction);
  }
  return matches;
}
```

```py
# @snippet-check
from kicbac import Kicbac, QueryTransaction

def query_python_attempt(order_id: str) -> list[QueryTransaction]:
    with Kicbac(security_key="test_security_key") as client:
        return list(client.query.transactions(order_id=order_id))
```

Persist a matching record and use its condition and action entries, or a
verified webhook, to resolve the attempt. JavaScript records preserve raw XML
keys; Python exposes typed `condition` and `actions` fields. An empty immediate
query is not proof that the write failed: keep the attempt blocked, query again
later, and require manual review when it remains uncertain. Never issue a new
write until reconciliation reaches a terminal outcome.

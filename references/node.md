# Node SDK

Package: `kicbac`

Use Node examples only on the server. Never expose `KICBAC_SECURITY_KEY` to browser bundles.

## Initialize

```ts
// @snippet-check
import { Kicbac } from "kicbac";

const kicbac = new Kicbac(); // reads KICBAC_SECURITY_KEY
```

## Sale With Token

```ts
// @snippet-check
import { randomUUID } from "node:crypto";
import { Kicbac } from "kicbac";

export async function saleWithToken(paymentToken: string) {
  const kicbac = new Kicbac();
  const orderId = `order_${randomUUID()}`;
  const result = await kicbac.transactions.sale({
    amount: "49.99",
    paymentToken,
    orderId,
  });

  if (result.ok) {
    console.log(result.transactionId);
  } else {
    console.log(result.message);
  }
  return result;
}
```

`result.ok === false` is a decline. Do not throw for it.
Generate `orderId` on the server and persist it with the business order before
the API call. Use a fresh ID for each new attempt; retain the same ID only to
query and reconcile an ambiguous outcome. It is a correlation key, not an
idempotency guarantee.

The transaction methods are `sale`, `authorize`, `credit`, `validate`,
`offline`, `capture`, `void`, `refund`, `update`, and
`completePartialPayment`. Query resources expose typed paginated
`transactions`, `customers`, `subscriptions`, `plans`, and `invoices`
iterators. Use `query.raw()` only for a read-only report without a typed model;
never include `security_key` in its parameter object.

`capture` requires `amount`. Set `payment: "check"` on an ACH void, refund, or
update. `completePartialPayment` always sends
`partial_payments=payment_in_full`. Product Manager operations are
`products.create`, `products.update`, and `products.delete`.

## Customer Vault

```ts
// @snippet-check
import { Kicbac } from "kicbac";

async function chargeSavedCustomer() {
  const token = "00000000-000000-000000-000000000000";
  const kicbac = new Kicbac({ securityKey: "test_security_key" });

  const initial = await kicbac.transactions.sale({
    amount: "49.99",
    paymentToken: token,
    vault: "add",
    initiatedBy: "customer",
    storedCredentialIndicator: "stored",
  });

  if (!initial.ok) return { ok: false, message: initial.message };
  if (!initial.customerVaultId) {
    throw new Error("Kicbac did not return a customer vault ID");
  }

  return kicbac.customers.charge({
    customerVaultId: initial.customerVaultId,
    amount: "29.00",
    initiatedBy: "merchant",
    storedCredentialIndicator: "used",
    initialTransactionId: initial.transactionId,
  });
}
```

The atomic initial sale submits the token once, creates the vault record only
for an approved transaction, and returns both IDs to persist for later charges.

## Subscriptions

```ts
// @snippet-check
import { Kicbac } from "kicbac";

const token = "00000000-000000-000000-000000000000";
const kicbac = new Kicbac({ securityKey: "test_security_key" });

const plan = await kicbac.plans.create({
  planId: "monthly-pro",
  name: "Monthly Pro",
  amount: "29.00",
  payments: 12,
  dayFrequency: 30,
});
if (!plan.ok) throw new Error(plan.message);

const subscription = await kicbac.subscriptions.create({
  planId: "monthly-pro",
  paymentToken: token,
});

const inlineSubscription = await kicbac.subscriptions.create({
  plan: { amount: "29.00", payments: 12, dayFrequency: 30 },
  paymentToken: token,
});
```

Do not invent unsupported plan methods such as `plans.delete`.
Provision plans outside request handlers. For repeatable sandbox setup, query
for the plan first or handle a verified already-exists response explicitly.

## Product Manager

```ts
// @snippet-check
import { Kicbac } from "kicbac";

const kicbac = new Kicbac({ securityKey: "test_security_key" });
const product = await kicbac.products.create({
  sku: "SKU-100",
  description: "Example product",
  cost: "19.99",
  currency: "USD",
});
if (!product.ok) throw new Error(product.message);
if (!product.productId) throw new Error("Kicbac did not return a product ID");

const updatedProduct = await kicbac.products.update({
  productId: product.productId,
  description: "Updated product",
});
if (!updatedProduct.ok) throw new Error(updatedProduct.message);

const deletedProduct = await kicbac.products.delete(product.productId);
if (!deletedProduct.ok) throw new Error(deletedProduct.message);
```

## Webhooks

```ts
// @snippet-check
import { constructEvent } from "kicbac";

export function verifyWebhook(rawBody: Uint8Array, signatureHeader: string | null) {
  return constructEvent(rawBody, signatureHeader, process.env.KICBAC_WEBHOOK_SIGNING_KEY!);
}
```

Pass the exact bytes and header received by the server; do not substitute sample
signatures or parse and reserialize the body first.

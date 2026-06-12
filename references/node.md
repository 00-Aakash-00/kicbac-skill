# Node SDK

Package: `kicbac`

Use Node examples only on the server. Never expose `KICBAC_SECURITY_KEY` to browser bundles.

## Initialize

```ts
import { Kicbac } from "kicbac";

const kicbac = new Kicbac(); // reads KICBAC_SECURITY_KEY
```

## Sale With Token

```ts
const result = await kicbac.transactions.sale({
  amount: "49.99",
  paymentToken: token,
  orderId: "order_123",
});

if (result.ok) {
  console.log(result.transactionId);
} else {
  console.log(result.message);
}
```

`result.ok === false` is a decline. Do not throw for it.

## Customer Vault

```ts
const vault = await kicbac.customers.create({
  paymentToken: token,
  billing: { firstName: "Jane", lastName: "Doe" },
});

if (!vault.ok) {
  return { ok: false, message: vault.message };
}

const charge = await kicbac.customers.charge({
  customerVaultId: vault.customerVaultId,
  amount: "29.00",
  initiatedBy: "merchant",
  storedCredentialIndicator: "used",
  initialTransactionId: vault.transactionId,
});
```

Use customer-initiated transaction data for the initial save, then merchant-initiated transaction fields for later stored-card charges.

## Subscriptions

```ts
await kicbac.plans.create({
  planId: "monthly-pro",
  name: "Monthly Pro",
  amount: "29.00",
  payments: 12,
  dayFrequency: 30,
});

const subscription = await kicbac.subscriptions.create({
  planId: "monthly-pro",
  paymentToken: token,
});
```

Do not invent unsupported plan methods such as `plans.delete`.

## Webhooks

```ts
import { constructEvent } from "kicbac";

const event = constructEvent(rawBody, signatureHeader, process.env.KICBAC_WEBHOOK_SIGNING_KEY!);
```

`rawBody` must be the exact bytes or exact string received from Kicbac.

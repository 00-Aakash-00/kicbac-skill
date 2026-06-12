# Next.js SDK

Package: `@kicbac/nextjs`

Keep payment secrets in App Router route handlers or server modules. Client components may render Kicbac React exports.

## Simple Sale Route

```ts
import { createKicbacRouteHandler } from "@kicbac/nextjs/server";

export const { POST } = createKicbacRouteHandler({
  amount: "49.99",
  saleParams: ({ body }) => ({
    orderId: String(body.metadata?.orderId ?? "order_123"),
  }),
});
```

Configure exactly one amount strategy: `amount`, `amountResolver`, or `allowInsecureClientAmount`.

## Client Component

```tsx
"use client";

import { KicbacPaymentForm, KicbacProvider } from "@kicbac/nextjs";
import "@kicbac/react/styles.css";

export function Checkout() {
  return (
    <KicbacProvider variant="light">
      <KicbacPaymentForm amount="49.99" endpoint="/api/checkout" />
    </KicbacProvider>
  );
}
```

## Subscription Route

`createKicbacRouteHandler` is for sales. For subscriptions, use a custom route and the server SDK:

```ts
import { Kicbac } from "kicbac";

const kicbac = new Kicbac();

export async function POST(request: Request) {
  const body = await request.json();
  const result = await kicbac.subscriptions.create({
    planId: String(body.planId),
    paymentToken: String(body.paymentToken),
  });

  if (!result.ok) {
    return Response.json({ ok: false, message: result.message }, { status: 402 });
  }

  return Response.json({ ok: true, subscriptionId: result.subscriptionId });
}
```

## Webhook Route

```ts
import { kicbacWebhookHandler } from "@kicbac/nextjs/server";

export const { POST } = kicbacWebhookHandler(
  {
    "transaction.sale.success": async (event) => {
      console.log(event.event_type);
    },
  },
  { signingKey: process.env.KICBAC_WEBHOOK_SIGNING_KEY! },
);
```

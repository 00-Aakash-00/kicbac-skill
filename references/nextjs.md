# Next.js SDK

Package: `@kicbac/nextjs`

Keep payment secrets in App Router route handlers or server modules. Client components may render Kicbac React exports.
The built-in payment form and sale handler exchange JSON `{ token, ... }`. The
custom subscription pair below deliberately exchanges `{ paymentToken }`.

## Simple Sale Route

```ts
// @snippet-check
import { createKicbacRouteHandler } from "@kicbac/nextjs/server";

export const runtime = "nodejs";

export const { POST } = createKicbacRouteHandler({
  amount: "49.99",
});
```

Configure exactly one amount strategy: `amount`, `amountResolver`, or `allowInsecureClientAmount`.
For production payments, pass a durable, unique, server-owned `orderId` through
`saleParams`. Resolve it from authenticated order state—not browser metadata or
a reused constant—so an ambiguous outcome can be queried and reconciled.
The simple handler does not persist an active browser attempt. Wrap production
writes in the same reservation/block/reconciliation boundary used by the
subscription route below.

## Client Component

```tsx
// @snippet-check
"use client";

import { KicbacPaymentForm, KicbacProvider } from "@kicbac/nextjs";

export function Checkout() {
  return (
    <KicbacProvider appearance={{ variables: { colorPrimary: "#f04ac4" } }}>
      <KicbacPaymentForm amount="49.99" endpoint="/api/checkout" />
    </KicbacProvider>
  );
}
```

## Subscription Route

`createKicbacRouteHandler` is for sales. For subscriptions, use a custom route and the server SDK:

The three declared persistence functions below are application interfaces.
Implement them with a transactional database: keep correlation keys unique,
generate `referenceId` on the server, and allow only one `processing` or
`unconfirmed` row per `(accountId, operationScope)`. Return that active row even
when a reload supplies a new correlation key.

```ts
// @snippet-check
import { readBodyCapped } from "@kicbac/nextjs/server";
import { Kicbac, KicbacError } from "kicbac";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const SUBSCRIPTION_OPERATION_SCOPE = "subscribe:monthly-pro";

interface StoredAttemptResponse {
  status: number;
  body: Record<string, unknown>;
}

interface AttemptReservation {
  created: boolean;
  referenceId: string;
  state: "processing" | "succeeded" | "declined" | "unconfirmed";
  storedResponse?: StoredAttemptResponse;
}

declare function requireAuthenticatedAccountId(request: Request): Promise<string>;
declare function reserveSubscriptionAttempt(input: {
  accountId: string;
  correlationKey: string;
  operationScope: string;
}): Promise<AttemptReservation>;
declare function storeSubscriptionAttemptResponse(
  referenceId: string,
  state: "succeeded" | "declined" | "unconfirmed",
  response: StoredAttemptResponse,
): Promise<void>;

export async function POST(request: Request) {
  const correlationKey = request.headers.get("X-Checkout-Correlation-Key")?.trim();
  if (!correlationKey || !/^[A-Za-z0-9_-]{16,64}$/.test(correlationKey)) {
    return Response.json({ ok: false, message: "A valid correlation key is required." }, { status: 400 });
  }

  const rawBody = await readBodyCapped(request, MAX_BODY_BYTES);
  if (rawBody === null) {
    return Response.json({ ok: false, message: "Request body too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return Response.json({ ok: false, message: "Expected valid JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ ok: false, message: "Expected a JSON object." }, { status: 400 });
  }
  if (Object.keys(body).length !== 1 || !("paymentToken" in body)) {
    return Response.json({ ok: false, message: "Submit only paymentToken." }, { status: 400 });
  }
  const rawPaymentToken = Reflect.get(body, "paymentToken");
  if (typeof rawPaymentToken !== "string" || rawPaymentToken.trim() === "") {
    return Response.json({ ok: false, message: "A payment token is required." }, { status: 400 });
  }
  const paymentToken = rawPaymentToken.trim();
  if (/^\d{13,19}$/.test(paymentToken.replace(/[\s-]/g, ""))) {
    return Response.json({ ok: false, message: "Submit a payment token, not card data." }, { status: 400 });
  }

  const accountId = await requireAuthenticatedAccountId(request);
  const attempt = await reserveSubscriptionAttempt({
    accountId,
    correlationKey,
    operationScope: SUBSCRIPTION_OPERATION_SCOPE,
  });
  if (!attempt.created) {
    if (
      (attempt.state === "succeeded" || attempt.state === "declined") &&
      attempt.storedResponse
    ) {
      return Response.json(attempt.storedResponse.body, {
        status: attempt.storedResponse.status,
      });
    }
    return Response.json(
      {
        ok: false,
        message: "This attempt is processing or unconfirmed. Reconcile it before retrying.",
        referenceId: attempt.referenceId,
        retryable: false,
      },
      { status: 409 },
    );
  }
  const referenceId = attempt.referenceId;

  try {
    const kicbac = new Kicbac();
    const result = await kicbac.subscriptions.create({
      planId: "monthly-pro",
      paymentToken,
      orderId: referenceId,
    });

    if (!result.ok) {
      const response = {
        status: 402,
        body: { ok: false, message: result.message, referenceId },
      };
      await storeSubscriptionAttemptResponse(referenceId, "declined", response);
      return Response.json(response.body, { status: response.status });
    }

    if (!result.subscriptionId) {
      const response = {
        status: 500,
        body: {
          ok: false,
          message: "Approval received without a subscription ID. Reconcile before retrying.",
          referenceId,
          retryable: false,
        },
      };
      await storeSubscriptionAttemptResponse(referenceId, "unconfirmed", response);
      return Response.json(response.body, { status: response.status });
    }

    const response = {
      status: 200,
      body: { ok: true, subscriptionId: result.subscriptionId, referenceId },
    };
    await storeSubscriptionAttemptResponse(referenceId, "succeeded", response);
    return Response.json(response.body, { status: response.status });
  } catch (error) {
    console.error("Kicbac subscription request failed", {
      referenceId,
      code: KicbacError.isKicbacError(error) ? error.code : "internal_error",
    });
    const response = {
      status: 500,
      body: {
        ok: false,
        message: "Outcome unconfirmed. Reconcile before retrying.",
        referenceId,
        retryable: false,
      },
    };
    await storeSubscriptionAttemptResponse(referenceId, "unconfirmed", response);
    return Response.json(response.body, { status: response.status });
  }
}
```

Resolve or allowlist plan IDs and prices on the server. Never trust a browser-submitted amount or plan ID.
The exact one-field body allowlist is the primary boundary. The digit-pattern
check is defense in depth for obvious PAN-shaped mistakes, not validation of
Kicbac's token format or comprehensive payment-data detection.

For production, authenticate the caller, bind the resulting subscription to
that account, enforce same-origin/CSRF protection when cookies are used, and
rate-limit the route per account and IP. The browser correlation key only
looks up an attempt row; it is not the active-attempt uniqueness boundary. The
database creates and persists a separate server-generated gateway reference
before calling Kicbac. Replay stored terminal responses without another gateway
call, and block any new operation in the same scope while a row is processing
or unconfirmed. Release that lock only after terminal reconciliation. Neither
key is proof of gateway idempotency.

## Webhook Route

```ts
// @snippet-check
import { kicbacWebhookHandler } from "@kicbac/nextjs/server";

export const runtime = "nodejs";

export const { POST } = kicbacWebhookHandler(
  {
    "transaction.sale.success": async (event) => {
      console.log(event.event_type);
    },
  },
  { signingKey: process.env.KICBAC_WEBHOOK_SIGNING_KEY! },
);
```

# React SDK

Package: `@kicbac/react`

React checkout UI must tokenize in the browser and send only tokens to a server route.
Treat the form's `amount` and metadata as display/client context only. The
server endpoint must resolve the authoritative price or allowlisted plan.

## Standard Checkout Form

```tsx
// @snippet-check
import { KicbacPaymentForm, KicbacProvider } from "@kicbac/react";

export function Checkout() {
  return (
    <KicbacProvider appearance={{ variables: { colorPrimary: "#f04ac4" } }}>
      <KicbacPaymentForm
        amount="49.99"
        currency="USD"
        endpoint="/api/checkout"
        buttonLabel="Pay $49.99"
        onSuccess={(result) => console.log(result.transactionId)}
        onError={(error) => console.error(error.message)}
      />
    </KicbacProvider>
  );
}
```

## Token-Only Submission

Use `onToken` when the server endpoint performs custom work such as creating a subscription:

```tsx
// @snippet-check
import { useRef, useState } from "react";
import { KicbacPaymentForm, KicbacProvider } from "@kicbac/react";

export function SubscriptionForm() {
  const correlationKey = useRef<string | null>(null);
  const [blockedHandle, setBlockedHandle] = useState<string | null>(null);

  const blockForReconciliation = (handle: string): never => {
    setBlockedHandle(handle);
    throw new Error(`Outcome unconfirmed. Reconcile ${handle} before another attempt.`);
  };

  return (
    <KicbacProvider>
      {blockedHandle ? (
        <p role="alert">Outcome unconfirmed. Contact support with {blockedHandle}.</p>
      ) : (
        <KicbacPaymentForm
          amount="29.00"
          currency="USD"
          onToken={async ({ token }) => {
            correlationKey.current ??= crypto.randomUUID();
            const fallbackHandle = `correlation key ${correlationKey.current}`;

            let response: Response;
            try {
              response = await fetch("/api/subscribe", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "X-Checkout-Correlation-Key": correlationKey.current,
                },
                body: JSON.stringify({ paymentToken: token }),
              });
            } catch {
              return blockForReconciliation(fallbackHandle);
            }

            let body: { ok?: unknown; message?: unknown; referenceId?: unknown };
            try {
              body = (await response.json()) as typeof body;
            } catch {
              return blockForReconciliation(fallbackHandle);
            }

            const reconciliationHandle =
              typeof body.referenceId === "string" ? body.referenceId : fallbackHandle;
            if (response.status === 402 && body.ok === false) {
              correlationKey.current = null;
              throw new Error(
                typeof body.message === "string" ? body.message : "Subscription declined",
              );
            }
            if (!response.ok || body.ok !== true) {
              return blockForReconciliation(reconciliationHandle);
            }
          }}
        />
      )}
    </KicbacProvider>
  );
}
```

The server must select or allowlist `monthly-pro`; do not send a plan or amount
from this browser payload and then treat it as the source of truth. A definitive
typed decline clears the correlation key so the next submission gets a fresh
server attempt. An ambiguous or operational failure keeps the correlation key
and removes the form until reconciliation. When no response arrived, support
uses that key to find the separate server-generated gateway reference. The key
does not make a gateway operation safe to retry by itself.

## Headless Fields

Render headless fields inside `KicbacProvider`; the returned props mount secure
Kicbac.js iframes rather than raw inputs.

```tsx
// @snippet-check
import { KicbacProvider, usePaymentForm } from "@kicbac/react";

function PaymentFields() {
  const form = usePaymentForm({
    amount: "49.99",
    endpoint: "/api/checkout",
  });
  const busy = form.status === "tokenizing" || form.status === "submitting";

  return (
    <form onSubmit={(event) => { event.preventDefault(); void form.submit(); }}>
      <div {...form.getFieldProps("ccnumber")} />
      <div {...form.getFieldProps("ccexp")} />
      <div {...form.getFieldProps("cvv")} />
      <button disabled={busy || !form.isValid}>Pay</button>
    </form>
  );
}

export function HeadlessCheckout() {
  return (
    <KicbacProvider>
      <PaymentFields />
    </KicbacProvider>
  );
}
```

The field props mount Kicbac.js iframes. Do not replace them with raw inputs.

## Appearance

Kicbac brand defaults:

- Primary: `#f04ac4`
- Dark: `#141442`
- Deep background: `#00112b`
- Font: Inter
- Radius: 10px controls and 16px larger surfaces

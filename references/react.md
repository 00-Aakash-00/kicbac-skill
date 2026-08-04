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

The built-in endpoint request is `{ token, amount?, currency?, metadata? }`.
The custom `onToken` example below deliberately sends `{ paymentToken }`, and
its custom route enforces that different one-field body.
For a production write, make the server attempt-aware and block every
non-decline endpoint failure until reconciliation; the next example shows that
state boundary. A generic endpoint error does not prove that no charge occurred.

## Token-Only Submission

Use `onToken` when the server endpoint performs custom work such as creating a subscription:

```tsx
// @snippet-check
import { useEffect, useRef, useState } from "react";
import { KicbacPaymentForm, KicbacProvider } from "@kicbac/react";

const PENDING_CORRELATION_KEY = "kicbac:subscription:pending-correlation";

function readPendingCorrelation(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_CORRELATION_KEY);
  } catch {
    return null;
  }
}

function rememberPendingCorrelation(value: string): void {
  try {
    window.sessionStorage.setItem(PENDING_CORRELATION_KEY, value);
  } catch {
    // The server-side active-attempt lock remains authoritative.
  }
}

function forgetPendingCorrelation(): void {
  try {
    window.sessionStorage.removeItem(PENDING_CORRELATION_KEY);
  } catch {
    // The server-side active-attempt lock remains authoritative.
  }
}

export function SubscriptionForm() {
  const correlationKey = useRef<string | null>(null);
  const [blockedHandle, setBlockedHandle] = useState<string | null>(null);

  useEffect(() => {
    const pendingKey = readPendingCorrelation();
    if (!pendingKey) return;
    correlationKey.current = pendingKey;
    setBlockedHandle(`correlation key ${pendingKey}`);
  }, []);

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
            const currentCorrelationKey = correlationKey.current;
            rememberPendingCorrelation(currentCorrelationKey);
            const fallbackHandle = `correlation key ${currentCorrelationKey}`;

            let response: Response;
            try {
              response = await fetch("/api/subscribe", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "X-Checkout-Correlation-Key": currentCorrelationKey,
                },
                body: JSON.stringify({ paymentToken: token }),
              });
            } catch {
              return blockForReconciliation(fallbackHandle);
            }

            let body: {
              ok?: unknown;
              message?: unknown;
              referenceId?: unknown;
              subscriptionId?: unknown;
            };
            try {
              body = (await response.json()) as typeof body;
            } catch {
              return blockForReconciliation(fallbackHandle);
            }

            const referenceId =
              typeof body.referenceId === "string" && body.referenceId.trim() !== ""
                ? body.referenceId.trim()
                : null;
            const subscriptionId =
              typeof body.subscriptionId === "string" && body.subscriptionId.trim() !== ""
                ? body.subscriptionId.trim()
                : null;
            const reconciliationHandle = referenceId ?? fallbackHandle;
            if (response.status === 402 && body.ok === false) {
              forgetPendingCorrelation();
              correlationKey.current = null;
              throw new Error(
                typeof body.message === "string" ? body.message : "Subscription declined",
              );
            }
            if (!response.ok || body.ok !== true || !subscriptionId) {
              return blockForReconciliation(reconciliationHandle);
            }
            forgetPendingCorrelation();
            correlationKey.current = null;
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
does not make a gateway operation safe to retry by itself. Browser storage only
restores the blocked UX after a reload; the server-side active-attempt lock is
the duplicate-prevention boundary, including when browser storage is
unavailable. Clear a restored key only after an
authenticated server status check reports terminal reconciliation, never merely
because time elapsed.

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

## ACH Hosted Fields

Compose the hosted bank fields with the same headless hook. These components
mount Kicbac.js iframes; they are not raw bank-account inputs.

```tsx
// @snippet-check
import {
  BankAccountField,
  BankAccountNameField,
  BankRoutingField,
  KicbacProvider,
  usePaymentForm,
} from "@kicbac/react";

function AchFields() {
  const form = usePaymentForm({ amount: "49.99", endpoint: "/api/ach" });
  const busy = form.status === "tokenizing" || form.status === "submitting";

  return (
    <form onSubmit={(event) => { event.preventDefault(); void form.submit(); }}>
      <BankAccountNameField form={form} />
      <BankRoutingField form={form} />
      <BankAccountField form={form} />
      <button disabled={busy || !form.isValid}>Pay by bank</button>
    </form>
  );
}

export function AchCheckout() {
  return (
    <KicbacProvider>
      <AchFields />
    </KicbacProvider>
  );
}
```

The built-in request posts `{ token }` to `/api/ach`; the server resolves the
amount and passes that opaque value as the Node SDK's `paymentToken`.

## Appearance

Kicbac brand defaults:

- Primary: `#f04ac4`
- Dark: `#141442`
- Deep background: `#00112b`
- Font: Inter
- Radius: 10px controls and 16px larger surfaces

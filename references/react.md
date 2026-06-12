# React SDK

Package: `@kicbac/react`

React checkout UI must tokenize in the browser and send only tokens to a server route.

## Standard Checkout Form

```tsx
import { KicbacPaymentForm, KicbacProvider } from "@kicbac/react";
import "@kicbac/react/styles.css";

export function Checkout() {
  return (
    <KicbacProvider variant="light">
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
<KicbacPaymentForm
  amount="29.00"
  currency="USD"
  onToken={async ({ token }) => {
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentToken: token, planId: "monthly-pro" }),
    });

    if (!response.ok) {
      throw new Error("Subscription failed");
    }
  }}
/>
```

## Headless Fields

```tsx
const form = usePaymentForm({
  amount: "49.99",
  endpoint: "/api/checkout",
});

return (
  <form onSubmit={form.handleSubmit}>
    <div {...form.getFieldProps("ccnumber")} />
    <div {...form.getFieldProps("ccexp")} />
    <div {...form.getFieldProps("cvv")} />
    <button disabled={form.isSubmitting}>Pay</button>
  </form>
);
```

The field props mount Collect.js iframes. Do not replace them with raw inputs.

## Appearance

Kicbac brand defaults:

- Primary: `#f04ac4`
- Dark: `#141442`
- Deep background: `#00112b`
- Font: Inter
- Radius: 10px controls and 16px larger surfaces

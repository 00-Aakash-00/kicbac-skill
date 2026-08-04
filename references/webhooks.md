# Webhooks

Kicbac sends:

```text
Webhook-Signature: t=<nonce>,s=<hex_signature>
```

Expected signature:

```text
HMAC_SHA256(signingKey, nonce + "." + rawBody)
```

Use exact raw request bytes and constant-time comparison. JSON reserialization changes the signature input.

## Node

```ts
// @snippet-check
import { createHmac } from "node:crypto";
import { constructEvent } from "kicbac";

const rawBody = new TextEncoder().encode(
  '{"event_id":"evt_123","event_type":"transaction.sale.success","event_body":{}}',
);
const nonce = "test-nonce";
const signingKey = "test_signing_key";
const signature = createHmac("sha256", signingKey)
  .update(`${nonce}.`)
  .update(rawBody)
  .digest("hex");
const signatureHeader = `t=${nonce},s=${signature}`;
const event = constructEvent(rawBody, signatureHeader, signingKey);
```

## Python

```py
# @snippet-check
import hashlib
import hmac

from kicbac import construct_event

raw_body = (
    b'{"event_id":"evt_123","event_type":"transaction.sale.success",'
    b'"event_body":{}}'
)
nonce = "test-nonce"
signing_key = "test_signing_key"
signature = hmac.new(
    signing_key.encode(),
    nonce.encode() + b"." + raw_body,
    hashlib.sha256,
).hexdigest()
signature_header = f"t={nonce},s={signature}"
event = construct_event(raw_body, signature_header, signing_key=signing_key)
```

These two standalone examples generate signatures only to create valid local
test fixtures. In production, pass the received raw bytes and
`Webhook-Signature` header unchanged to the verifier.

## Event Types

- `transaction.{sale,auth,capture,void,refund,credit}.{success,failure,unknown}`
- `transaction.check.status.{settle,return,latereturn}`
- `recurring.{plan,subscription}.{add,update,delete}`
- `settlement.batch.{complete,failure}` and `chargeback.batch.complete`
- `acu.summary.{automaticallyupdated,closedaccount,contactcustomer}`

Treat a transaction `unknown` outcome as ambiguous. Reconcile the stored
transaction or order reference before allowing a new payment attempt.

## Next.js

```ts
// @snippet-check
import { kicbacWebhookHandler } from "@kicbac/nextjs/server";

export const runtime = "nodejs";

export const { POST } = kicbacWebhookHandler(
  {
    "settlement.batch.complete": async (event) => {
      console.log(event.event_type);
    },
  },
  { signingKey: process.env.KICBAC_WEBHOOK_SIGNING_KEY! },
);
```

## Retry Handling

Return exactly HTTP 200 only after durable handling. Any other status is retried.
Deduplicate by event identifiers and transaction identifiers because delivery
can repeat.

Use a durable inbox table with a unique constraint on `event_id`. In the
verified handler, atomically insert the full event with a `pending` status and
`ON CONFLICT DO NOTHING`, then return HTTP 200 only after that transaction commits.
A worker can process pending rows and mark them `completed` only after business
work succeeds. Do not use an in-memory set, and do not mark an event completed
before its work finishes.

Use the canonical verifier vectors at
`https://github.com/00-Aakash-00/kicbac-js/blob/main/openapi/webhooks/vectors.json`.

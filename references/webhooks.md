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
import { constructEvent } from "kicbac";

const event = constructEvent(rawBody, signatureHeader, signingKey);
```

## Python

```py
from kicbac import construct_event

event = construct_event(raw_body, signature_header, signing_key=signing_key)
```

## Next.js

```ts
import { kicbacWebhookHandler } from "@kicbac/nextjs/server";

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

Return a 2xx response only after durable handling. Return a non-2xx status for retriable failures. Deduplicate by event identifiers and transaction identifiers because delivery can repeat.

Use `openapi/webhooks/vectors.json` for verifier tests.

# Python SDK

Package: `kicbac`

Use Python examples on the server. Browser code must never receive `KICBAC_SECURITY_KEY`.

## Sync Client

```py
from kicbac import Kicbac

client = Kicbac()  # reads KICBAC_SECURITY_KEY

result = client.transactions.sale(
    amount="49.99",
    payment_token=token,
    order_id="order_123",
)

if result.ok:
    print(result.transaction_id)
else:
    print(result.response_text)
```

Declines are typed results, not exceptions.

## Async Client

```py
from kicbac import AsyncKicbac

async with AsyncKicbac() as client:
    result = await client.transactions.sale(
        amount="49.99",
        payment_token=token,
    )
```

## Customer Vault

```py
vault = client.customers.create(
    payment_token=token,
    billing={"first_name": "Jane", "last_name": "Doe"},
)

if not vault.ok:
    return {"ok": False, "message": vault.response_text}

charge = client.customers.charge(
    vault.customer_vault_id,
    amount="29.00",
    initiated_by="merchant",
    stored_credential_indicator="used",
    initial_transaction_id=vault.transaction_id,
)
```

## Subscriptions

```py
client.plans.create(
    "monthly-pro",
    name="Monthly Pro",
    amount="29.00",
    payments=12,
    day_frequency=30,
)

subscription = client.subscriptions.create(
    "monthly-pro",
    payment_token=token,
)
```

## Webhooks

```py
from kicbac import construct_event

event = construct_event(
    raw_body,
    signature_header,
    signing_key=os.environ["KICBAC_WEBHOOK_SIGNING_KEY"],
)
```

Use raw request bytes exactly as received.

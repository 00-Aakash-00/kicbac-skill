# Python SDK

Package: `kicbac`

Use Python examples on the server. Browser code must never receive `KICBAC_SECURITY_KEY`.

## Sync Client

```py
# @snippet-check
from kicbac import Kicbac

token = "00000000-000000-000000-000000000000"
client = Kicbac(security_key="test_security_key")

result = client.transactions.sale(
    amount="49.99",
    payment_token=token,
    order_id="order_123",
)

if result.ok:
    print(result.transaction_id)
else:
    print(result.message)
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
# @snippet-check
from kicbac import Kicbac

token = "00000000-000000-000000-000000000000"
client = Kicbac(security_key="test_security_key")

sale_result = client.transactions.sale(
    amount="49.99",
    payment_token=token,
    initiated_by="customer",
    stored_credential_indicator="stored",
)
if not sale_result.ok:
    raise RuntimeError(sale_result.message)

vault = client.customers.create(
    payment_token=token,
    billing={"first_name": "Jane", "last_name": "Doe"},
)

if not vault.ok:
    raise RuntimeError(vault.response_text)
if vault.customer_vault_id is None:
    raise RuntimeError("missing customer vault id")

charge = client.customers.charge(
    vault.customer_vault_id,
    amount="29.00",
    initiated_by="merchant",
    stored_credential_indicator="used",
    initial_transaction_id=sale_result.transaction_id,
)
```

Python `customers.create` returns `VaultResult` with `customer_vault_id`; use the initial customer-initiated sale result for `initial_transaction_id`. The JavaScript SDK maps vault creation to a transaction result shape, so its fields differ.

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

# Python SDK

Package: `kicbac`

Use Python examples on the server. Browser code must never receive `KICBAC_SECURITY_KEY`.

## Sync Client

```py
# @snippet-check
from uuid import uuid4

from kicbac import Kicbac

token = "00000000-000000-000000-000000000000"
client = Kicbac(security_key="test_security_key")
order_id = f"order_{uuid4().hex}"

result = client.transactions.sale(
    amount="49.99",
    payment_token=token,
    order_id=order_id,
)

if result.ok:
    print(result.transaction_id)
else:
    print(result.message)
```

Declines are typed results, not exceptions.
Generate `order_id` on the server and persist it with the business order before
the API call. Use a fresh ID for each new attempt; retain the same ID only to
query and reconcile an ambiguous outcome. It is a correlation key, not an
idempotency guarantee.

The transaction methods are `sale`, `authorize`, `credit`, `validate`,
`offline`, `capture`, `void`, `refund`, `update`, and
`complete_partial_payment`. `sale` and `authorize` support split tender through
`partial_payments` and `partial_payment_id`. Query resources expose typed
paginated `transactions`, `customers`, `subscriptions`, `plans`, and `invoices`
iterators. Use `query.raw()` only for a read-only report without a typed model;
never pass `security_key` in its parameter mapping.

`capture` requires `amount`. Pass `payment="check"` on an ACH void, refund, or
update. `complete_partial_payment()` always sends
`partial_payments=payment_in_full`. Product Manager operations are
`products.create`, `products.update`, and `products.delete`.

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

initial = client.transactions.sale(
    amount="49.99",
    payment_token=token,
    initiated_by="customer",
    stored_credential_indicator="stored",
)
if not initial.ok:
    raise RuntimeError(initial.message)

vault = client.customers.create(source_transaction_id=initial.transaction_id)
if not vault.ok:
    raise RuntimeError(vault.response_text)
if vault.customer_vault_id is None:
    raise RuntimeError("missing customer vault id")

charge = client.customers.charge(
    vault.customer_vault_id,
    amount="29.00",
    initiated_by="merchant",
    stored_credential_indicator="used",
    initial_transaction_id=initial.transaction_id,
)
```

Python submits the single-use token only for the initial customer-initiated
sale, then creates the vault record from that approved transaction. Persist the
sale ID and `VaultResult.customer_vault_id` for future merchant-initiated
charges. Node can perform the initial sale and vault creation atomically.

## Subscriptions

```py
# @snippet-check
from kicbac import Kicbac

token = "00000000-000000-000000-000000000000"
client = Kicbac(security_key="test_security_key")

plan = client.plans.create(
    "monthly-pro",
    name="Monthly Pro",
    amount="29.00",
    payments=12,
    day_frequency=30,
)
if not plan.ok:
    raise RuntimeError(plan.response_text)

subscription = client.subscriptions.create(
    "monthly-pro",
    payment_token=token,
)
if not subscription.ok:
    raise RuntimeError(subscription.response_text)

# Or use a one-off inline schedule instead of a saved plan ID.
inline_subscription = client.subscriptions.create(
    plan={"amount": "29.00", "payments": 12, "day_frequency": 30},
    payment_token=token,
)
if not inline_subscription.ok:
    raise RuntimeError(inline_subscription.response_text)
```

## Product Manager

```py
# @snippet-check
from kicbac import Kicbac

client = Kicbac(security_key="test_security_key")
product = client.products.create(
    sku="SKU-100",
    description="Example product",
    cost="19.99",
    currency="USD",
)
if not product.ok:
    raise RuntimeError(product.response_text)
```

## Webhooks

```py
# @snippet-check
import os

from kicbac import WebhookEvent, construct_event

def verify_webhook(raw_body: bytes, signature_header: str | None) -> WebhookEvent:
    return construct_event(
        raw_body,
        signature_header,
        signing_key=os.environ["KICBAC_WEBHOOK_SIGNING_KEY"],
    )
```

Pass the exact request bytes and header received by the server; do not
substitute sample signatures or parse and reserialize the body first.

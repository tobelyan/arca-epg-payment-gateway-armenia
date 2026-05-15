# arca-epg-payment-gateway-armenia

**Node.js client for the ARCA EPG (Electronic Payment Gateway).**

Supports all Armenian banks connected to the ARCA network — ACBA, ASHIB, INECO, Converse Bank, and others. Includes full card binding (tokenization) support for recurring/saved-card payments.

## Supported Banks

All banks on the ARCA EPG network, including:
- ACBA Bank
- ASHIB Bank (Ardshinbank)
- INECO Bank
- Converse Bank
- and other arca.am partners

## Endpoints

| Environment | URL |
|-------------|-----|
| Production  | `https://epg.arca.am/payment/rest/` |
| Test        | `https://testepg.arca.am/payment/rest/` |

## Installation

```bash
npm install arca-epg-payment-gateway-armenia
```

## Quick Start

```js
const ArcaEpg = require('arca-epg-payment-gateway-armenia');

const gateway = new ArcaEpg({
  username: process.env.ARCA_USERNAME,
  password: process.env.ARCA_PASSWORD,
  testMode: true, // set false for production
});
```

TypeScript:

```ts
import ArcaEpg from 'arca-epg-payment-gateway-armenia';
```

---

## Amounts

All amounts must be passed in **minor units** (tiyn).

| You want to charge | Pass `amount` |
|--------------------|---------------|
| 10 AMD             | `1000`        |
| 100 AMD            | `10000`       |
| 5.50 USD           | `550`         |

---

## Basic Payment Flow

### 1. Register an order

```js
const response = await gateway.purchase({
  transactionId: 'ORDER-001',    // your unique order ID
  amount: 1000,                  // 10.00 AMD in minor units
  returnUrl: 'https://yoursite.am/payment/callback',
  currency: '051',               // AMD = 051, USD = 840
  description: 'Order #001',
  language: 'hy',               // hy / ru / en
});

if (response.isRedirect()) {
  // Redirect the customer to ARCA's hosted payment page
  const paymentUrl = response.getRedirectUrl();
  res.redirect(paymentUrl);
  // or: response.redirect(res);
}

// Save this for the callback
const arcaOrderId = response.getTransactionReference();
```

### 2. Handle the callback

ARCA redirects to your `returnUrl` with `?orderId=...` appended.

```js
// Express example
app.get('/payment/callback', async (req, res) => {
  const response = await gateway.getOrderStatusExtended({
    transactionId: req.query.orderId,
  });

  if (response.isSuccessful()) {
    // Payment confirmed — fulfill the order
  } else {
    const error = response.getMessage();
  }
});
```

---

## All Methods

### `purchase(params)` — Register order

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | Your unique order number |
| `amount` | yes | Amount in minor units |
| `returnUrl` | yes | Customer redirect URL after payment |
| `currency` | no | ISO 4217 numeric (`051` = AMD, `840` = USD) |
| `description` | no | Order description |
| `language` | no | `hy` / `ru` / `en` |
| `pageView` | no | `DESKTOP` or `MOBILE` |
| `clientId` | no | Required when saving a card binding |
| `jsonParams` | no | JSON string of extra parameters |
| `sessionTimeoutSecs` | no | Session timeout in seconds |

### `registerPreAuth(params)` — Two-phase payment

Same parameters as `purchase()`. Reserves the amount without charging. Call `deposit()` to confirm.

### `deposit(params)` — Confirm pre-authorization

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | ARCA `orderId` from `registerPreAuth` |
| `amount` | yes | Amount to charge (≤ pre-auth amount) in minor units |

### `reverse(params)` — Cancel an order

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | ARCA `orderId` |
| `language` | no | |

### `refund(params)` — Refund a completed order

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | ARCA `orderId` |
| `amount` | yes | Amount to refund in minor units |

### `getOrderStatus(params)` — Basic status check

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | ARCA `orderId` |
| `language` | no | |

### `getOrderStatusExtended(params)` — Full status with card & binding details

Same parameters as `getOrderStatus()`.

### `verifyEnrollment(params)` — Check 3DS enrollment

| Param | Required | Description |
|-------|----------|-------------|
| `pan` | yes | Card number |

---

## Card Binding (Tokenization)

Bind a card once, then charge it later without the customer re-entering details.

### Step 1 — Register with `clientId`

```js
const response = await gateway.purchase({
  transactionId: 'ORDER-001',
  amount: 1000,
  returnUrl: 'https://yoursite.am/payment/callback',
  clientId: String(user.id),   // ties the binding to your user
});

response.redirect(res);
```

### Step 2 — Retrieve binding after payment

```js
const response = await gateway.getOrderStatusExtended({
  transactionId: arcaOrderId,
});

if (response.isSuccessful()) {
  const data = response.getData();
  const bindingId  = data.bindingInfo.bindingId;
  const pan        = data.cardAuthInfo.pan;        // masked, e.g. 411111**1111
  const expiration = data.cardAuthInfo.expiration;
  // Save bindingId to your database
}
```

### Step 3 — Pay with saved card

```js
const response = await gateway.makeBindingPayment({
  transactionId: 'ORDER-002',
  amount: 2500,
  bindingId: savedBindingId,
  language: 'hy',
});

if (response.isSuccessful()) {
  // Silent charge succeeded
} else if (response.isRedirect()) {
  // 3DS challenge required
  response.redirect(res);
}
```

### `makeBindingPayment(params)`

| Param | Required | Description |
|-------|----------|-------------|
| `transactionId` | yes | Your unique order number |
| `amount` | yes | Amount in minor units |
| `bindingId` | yes | Saved binding ID |
| `currency` | no | |
| `clientId` | no | |
| `language` | no | |
| `description` | no | |
| `jsonParams` | no | |
| `mdOrder` | no | ARCA orderId if pre-registered |

### `activateCardBinding(params)` — Activate a binding

| Param | Required |
|-------|----------|
| `bindingId` | yes |

### `unBindCard(params)` — Deactivate a binding

```js
await gateway.unBindCard({ bindingId: savedBindingId });
```

| Param | Required |
|-------|----------|
| `bindingId` | yes |
| `language` | no |

### `getBindings(params)` — List all bindings for a client

```js
const response = await gateway.getBindings({ clientId: String(user.id) });
const bindings = response.getData().bindings;
```

| Param | Required |
|-------|----------|
| `clientId` | yes |
| `language` | no |

---

## Response API

Every method returns a `Response` instance:

| Method | Returns | Description |
|--------|---------|-------------|
| `isSuccessful()` | `boolean` | Payment complete with no error |
| `isRedirect()` | `boolean` | Response has a payment page URL |
| `getRedirectUrl()` | `string\|null` | ARCA payment page URL |
| `redirect(res?)` | `string\|null` | Redirect helper (pass Express `res` or use the URL) |
| `getTransactionReference()` | `string\|null` | ARCA `orderId` |
| `getOrderNumberReference()` | `string\|null` | Your original order number |
| `getOrderStatus()` | `number\|null` | Numeric status code |
| `getCode()` | `number\|null` | Error code (0 = no error) |
| `getMessage()` | `string\|null` | Error message |
| `getActionCodeDescription()` | `string\|null` | Human-readable action description |
| `getData()` | `object` | Full raw response from ARCA |

### Order Status Codes

| Code | Meaning |
|------|---------|
| 0 | Registered, not paid |
| 1 | Amount pre-authorized (reserved) |
| 2 | Deposited (fully paid) |
| 3 | Cancelled |
| 4 | Refunded |
| 5 | ACS authorization initiated |
| 6 | Rejected |

---

## Error Handling

All network and validation errors throw. Wrap calls in `try/catch`:

```js
try {
  const response = await gateway.purchase({ ... });
} catch (err) {
  // Validation error (missing required param) or network error
  console.error(err.message);
}
```

---

## License

MIT © [Rafayel Tobelyan](https://github.com/tobelyan)

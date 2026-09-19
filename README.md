# MyShop — Store + Reselling Commerce Platform

A production-oriented e-commerce foundation for a personal shop that sells your own inventory plus selected sourced/reselling products such as manually sourced Meesho items.

## Architecture

Frontend: Next.js 16 App Router + React 19. Responsive storefront, product pages, cart, checkout, authentication, customer account/order tracking, and admin console.

Data: Firebase Authentication + Cloud Firestore. Firebase Admin SDK is used only on trusted server routes.

Payments: Razorpay Standard Checkout. The server creates Razorpay Orders from server-validated catalog data, verifies the checkout signature, and reconciles webhook events.

Reselling: Every product has sourceType (own/resell), supplier, optional private supplier URL, private costPrice, public selling price, stock and active status. Cost/profit information is snapshotted into the admin-only order_finance collection so customers never receive sourcing margins.

## Firestore collections

- users/{uid}
- products/{productId}
- orders/{orderId}
- order_finance/{orderId}
- settings/{id}
- coupons/{id}
- reviews/{id}

## Main routes

- / — storefront
- /products/[slug] — product details
- /cart — cart
- /checkout — address + payment
- /login — sign in / sign up
- /account — customer orders
- /admin — products, margins and orders

## Payment lifecycle

1. Client sends product IDs and quantities to the server.
2. Server reads authoritative products from Firestore and validates active/stock state.
3. Server calculates the real amount and creates the internal order.
4. Server creates a Razorpay Order.
5. Browser opens Razorpay Checkout.
6. Success payload is sent to the server.
7. Server verifies HMAC-SHA256(order_id + "|" + payment_id).
8. Razorpay webhooks reconcile payment.captured, payment.failed and order.paid.

## Firebase setup

1. Create a Firebase project and Web App.
2. Enable Email/Password Authentication.
3. Create Firestore.
4. Copy web config values into .env.
5. Create a Firebase Admin service account and add server credentials to .env.
6. Deploy firestore.rules.
7. Create a customer account at /login.
8. In Firestore, set users/{yourUid}.role to admin.
9. Add products from /admin or use npm run seed after server credentials are configured.

## Local development

    npm install
    cp .env.example .env
    npm run dev

Use Razorpay Test Mode for development. Never put the Razorpay secret, webhook secret, or Firebase Admin private key in NEXT_PUBLIC_* variables.

## Deployment

Vercel is a natural deployment target for this Next.js application. Configure all environment variables in Vercel before enabling live Firebase/Razorpay operations.

## Planned extensions

Shipping-label integration, automated stock sync, coupons, reviews, invoices/GST, returns/refunds, abandoned-cart recovery, analytics, and supplier automation can be added without changing the storefront contract.

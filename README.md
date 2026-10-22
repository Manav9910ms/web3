# MyShop

A single-shop online storefront for a real physical shop. Customers scan a permanent wall QR code, browse inventory, verify their phone with Firebase OTP, place an order for Saturday home delivery, and pay through Razorpay. The shop owner manages products, inventory, orders, delivery settings and fulfillment in the admin dashboard.

## Included platform features
- Responsive catalog, search, categories, product details and cart.
- Firebase Phone OTP sign-in with reCAPTCHA.
- Firestore catalog, server-side prices and stock checks.
- Atomic reservations, Razorpay order creation, payment signature/API verification and webhook verification.
- Saturday-only delivery scheduling in Asia/Kolkata with configurable Friday cutoff, PIN-code coverage, fees, minimum basket and order capacity.
- Admin-only product/inventory management, image uploads, fulfillment status and delivery settings.
- SMS and official WhatsApp message outbox with retry/backoff.
- Sample catalog is clearly marked and cannot be checked out while Firebase Admin is unconfigured.

## Local setup
1. Install Node.js 20.9 or later and run npm install.
2. Copy .env.example to .env.local.
3. In Firebase Console enable Phone sign-in, restrict allowed SMS regions, authorize your domains, create Firestore and enable Storage.
4. Add Firebase web app settings to the NEXT_PUBLIC_FIREBASE variables.
5. Create a Firebase service account and set its one-line JSON in FIREBASE_SERVICE_ACCOUNT_JSON. Never commit this credential.
6. Sign in once using Firebase Auth and set ADMIN_UIDS to the trusted owner's Firebase UID.
7. Add Razorpay test credentials. Configure a webhook at /api/webhooks/razorpay for order.paid and payment.captured and set RAZORPAY_WEBHOOK_SECRET.
8. Run npm run dev. Open Shop admin, configure deliverable PIN codes and save settings before taking orders.

## Vercel setup
Import the repository with the project root set to the repository root. Configure variables from .env.example for the correct environments. Deploy firestore.rules and storage.rules, configure the Firebase bucket, and set CRON_SECRET. Add the production domain to Firebase Auth's authorized domains. Test with Razorpay test keys before using live credentials.

For SMS, choose a compliant transactional SMS provider for India and adapt the JSON body in src/lib/notifications.ts to its API and approved template. For WhatsApp, configure the official WhatsApp Cloud API and an approved template in WhatsApp Manager. Customers explicitly opt in to transactional SMS/WhatsApp updates at checkout.

## Important launch and operating notes
- Never place Razorpay, Firebase service-account, webhook, or cron secrets in browser code, NEXT_PUBLIC variables, or Git.
- Firestore rules deny direct client access. Every admin API verifies the Firebase identity and configured owner UID.
- Inventory from in-person sales is not automatically synchronized. Adjust stock after counter sales to keep online availability correct.
- Product-image upload requires a Firebase Storage bucket where public product images are allowed. If public objects are blocked, configure an image-delivery strategy or enter public HTTPS image URLs.
- Test simultaneous purchases for the last item, abandoned/expired payments, duplicate webhooks, delayed/late payments, refund reconciliation and cutoff rules before launch.
- Add shop contact details, delivery and cancellation/refund terms, and a privacy notice before public launch.
- The QR code should point to the permanent HTTPS production URL, not a preview deployment.

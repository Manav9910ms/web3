# MyShop

Next.js + Firebase starter. Routes: / storefront, /signin authentication, /admin admin product form.

1. Run npm install.
2. Create .env.local from .env.example and fill the six Firebase web configuration values.
3. Firebase Console → Authentication → Sign-in method: enable Google and Email/Password.
4. Create Firestore and publish the included firestore.rules.
5. Register with your account. In Firestore, open users/YOUR_AUTH_UID and add role as string admin. Never let public sign-up assign this role.
6. Run npm run dev; open http://localhost:3000.
7. Push to GitHub; Vercel should redeploy. Confirm the six NEXT_PUBLIC_FIREBASE_* variables exist in relevant Vercel environments, then redeploy.

Note: homepage cards are sample placeholders. Admin product creation saves to Firestore. No cart, checkout, or payments are included.
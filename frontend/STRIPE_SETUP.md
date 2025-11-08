# Stripe Integration Setup

This document explains how to set up Stripe for the donation feature.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (starts with sk_test_ for test mode, sk_live_ for live mode)
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook signing secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # Your app's base URL (change for production)
```

## Stripe Dashboard Setup

1. **Get your API keys:**

   - Go to https://dashboard.stripe.com/apikeys
   - Copy your "Secret key" (starts with `sk_test_` for test mode)
   - Add it to `.env.local` as `STRIPE_SECRET_KEY`

2. **Set up webhook endpoint:**

   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Enter your webhook URL: `https://yourdomain.com/api/stripe-webhook`
   - Select events to listen to: `checkout.session.completed`
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

3. **For local development:**
   - Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
   - The CLI will provide a webhook signing secret for local testing
   - Use that secret in your `.env.local` file

## How It Works

1. User clicks "Send" button in the donation modal
2. Frontend calls `/api/create-checkout-session` with donation details
3. API creates a Stripe Checkout session and returns the checkout URL
4. User is redirected to Stripe Checkout to complete payment
5. After payment, Stripe redirects to `/donation/success` or `/donation/cancel`
6. Stripe sends a webhook to `/api/stripe-webhook` when payment is completed
7. Webhook handler creates the monetary donation record in the database

## Testing

1. Use Stripe test cards: https://stripe.com/docs/testing
2. Recommended test card: `4242 4242 4242 4242`
3. Use any future expiry date and any 3-digit CVC
4. Use any postal code

## Production Checklist

- [ ] Switch to live mode API keys
- [ ] Update `NEXT_PUBLIC_BASE_URL` to your production domain
- [ ] Set up webhook endpoint in Stripe Dashboard with production URL
- [ ] Test the full payment flow
- [ ] Verify webhook is receiving events correctly

# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing on the `/reserve` page.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to your Stripe Dashboard

## Setup Instructions

### 1. Get Your Stripe API Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Click on **Developers** in the left sidebar
3. Click on **API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

### 2. Configure Backend Environment Variables

1. Open the `backend/.env` file
2. Replace the placeholder values with your actual Stripe keys:

```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

**Important:** 
- Never commit your `.env` file to version control
- Use test keys (`sk_test_` and `pk_test_`) for development
- Use live keys (`sk_live_` and `pk_live_`) only in production

### 3. Restart Your Backend Server

After updating the `.env` file, restart your backend server:

```bash
cd backend
npm start
```

### 4. Test the Integration

1. Start your frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to http://localhost:3000/reserve

3. Complete the reservation form:
   - Select pickup and return dates
   - Choose a vehicle
   - Fill in customer details
   - Click the **"Stripe Payment"** button to switch to Stripe payment mode

4. Use Stripe test cards for testing:
   - **Successful payment:** `4242 4242 4242 4242`
   - **Declined payment:** `4000 0000 0000 0002`
   - **Requires authentication:** `4000 0025 0000 3155`
   - Use any future expiry date (e.g., `12/34`)
   - Use any 3-digit CVV (e.g., `123`)

### 5. Features Implemented

✅ **Dual Payment Mode:**
- Toggle between "Demo Payment" (for testing without Stripe) and "Stripe Payment"

✅ **Stripe Elements Integration:**
- Secure, PCI-compliant payment form
- Automatic card validation
- Support for multiple payment methods

✅ **Backend Payment Processing:**
- Payment Intent creation
- Payment verification
- Secure payment reference storage

✅ **Error Handling:**
- Clear error messages for failed payments
- Validation feedback
- Graceful fallback to demo mode if Stripe is not configured

### 6. Payment Flow

1. Customer fills out reservation details
2. Customer selects "Stripe Payment" mode
3. Stripe Payment Form loads with the total amount
4. Customer enters card details
5. Payment is processed securely through Stripe
6. Payment Intent ID is stored as the payment reference
7. Reservation is confirmed with the payment reference

### 7. Testing Checklist

- [ ] Stripe keys are configured in `.env`
- [ ] Backend server is running
- [ ] Frontend server is running
- [ ] Can toggle between Demo and Stripe payment modes
- [ ] Stripe payment form loads correctly
- [ ] Can successfully process a test payment
- [ ] Payment reference is captured correctly
- [ ] Reservation is created with payment confirmation

### 8. Production Deployment

When deploying to production:

1. **Get Live API Keys:**
   - Switch to "Live mode" in Stripe Dashboard
   - Copy your live keys (starting with `sk_live_` and `pk_live_`)

2. **Update Production Environment:**
   - Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in your production environment
   - Never hardcode keys in your source code

3. **Enable Webhooks (Optional but Recommended):**
   - Set up webhook endpoints for payment events
   - Configure webhook secret in your environment variables

4. **Test in Production:**
   - Use real cards in live mode
   - Monitor payments in Stripe Dashboard

### 9. Troubleshooting

**Problem:** "Stripe is not configured" error
- **Solution:** Verify that both `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are set in your `.env` file and restart the backend server

**Problem:** Payment form doesn't load
- **Solution:** Check browser console for errors. Ensure the frontend can reach the backend API at `http://localhost:5000`

**Problem:** Payment fails with "Invalid API key"
- **Solution:** Double-check that you copied the correct keys from Stripe Dashboard. Make sure there are no extra spaces.

**Problem:** CORS errors
- **Solution:** Ensure your backend CORS configuration allows requests from your frontend origin

### 10. Security Best Practices

✅ **Never expose secret keys** - Keep `STRIPE_SECRET_KEY` on the server only
✅ **Use HTTPS in production** - Stripe requires HTTPS for live payments
✅ **Validate on the server** - Always verify payment status on the backend
✅ **Store minimal card data** - Never store full card numbers; use Stripe's tokens
✅ **Monitor for fraud** - Use Stripe Radar for fraud detection

### 11. Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [Payment Intents API](https://stripe.com/docs/payments/payment-intents)

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the backend server logs
3. Review the Stripe Dashboard for payment attempts
4. Consult the Stripe documentation

---

**Note:** This integration uses Stripe Payment Intents API with automatic payment methods, which supports cards, Apple Pay, Google Pay, and other payment methods based on your Stripe account configuration.

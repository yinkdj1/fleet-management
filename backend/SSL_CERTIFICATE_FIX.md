# SSL Certificate Error Fix for Vercel URLs

## Issue
When clicking modify/cancel links in booking confirmation emails, users received an SSL certificate error:
```
Your connection is not private
net::ERR_CERT_COMMON_NAME_INVALID
```

The URL was: `https://www.fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app`

## Root Cause
Vercel deployment URLs do NOT support the `www.` subdomain. The SSL certificate is only valid for the direct Vercel URL without the `www.` prefix.

Using `https://www.fleet-management-...vercel.app` causes a certificate mismatch because:
- The SSL certificate is issued for: `fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app`
- But the browser is trying to access: `www.fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app`

## Solution
Removed the `www.` prefix from the Vercel URL in the environment configuration.

### Before (Incorrect)
```env
FRONTEND_BASE_URL_NONPROD=https://www.fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app
```

### After (Correct)
```env
FRONTEND_BASE_URL_NONPROD=https://fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app
```

## Important Notes

1. **Vercel URLs**: Never use `www.` subdomain with Vercel deployment URLs
2. **Custom Domains**: If you add a custom domain to Vercel (like `www.carsgidi.com`), you can use `www.` because you control the SSL certificate
3. **Production URL**: `https://www.carsgidi.com` is correct because it's a custom domain with proper SSL setup

## Files Modified

- `backend/.env` - Removed `www.` from FRONTEND_BASE_URL_NONPROD
- `backend/.env.example` - Updated with warning comment about Vercel URLs
- `backend/SSL_CERTIFICATE_FIX.md` - This documentation file

## Testing

1. Set `NODE_ENV=staging` in your `.env` file (for Vercel preview)
2. Restart the backend server
3. Create a test booking
4. Check the confirmation email
5. Click "Modify Reservation" or "Cancel Reservation"
6. Verify the link opens without SSL certificate errors

## Related Documentation

- `backend/EMAIL_REDIRECT_FIX.md` - Previous fix for NODE_ENV configuration
- `backend/BOOKING_EMAIL_FIX.md` - Original documentation about link structure

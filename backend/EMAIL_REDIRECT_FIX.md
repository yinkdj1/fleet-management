# Email Modify/Cancel Button Redirect Fix

## Issue
The modify and cancel reservation buttons in booking confirmation emails were redirecting to the carsgidi.com admin login page instead of the guest booking management page.

## Root Cause
The `NODE_ENV` environment variable was not set in the `.env` file. Without this variable, the system defaults to "development" mode, but the behavior was inconsistent depending on how the backend was started.

The `getFrontendBaseUrl()` function in `src/services/bookingService.js` uses `NODE_ENV` to determine which frontend URL to use:
- `NODE_ENV=development` → Uses `FRONTEND_BASE_URL_DEV` (http://localhost:3000)
- `NODE_ENV=production` → Uses `FRONTEND_BASE_URL_PROD` (https://www.carsgidi.com)
- `NODE_ENV=staging|test|other` → Uses `FRONTEND_BASE_URL_NONPROD` (Vercel preview URL)

## Solution
Added explicit `NODE_ENV=development` to the `.env` file to ensure consistent behavior.

## How to Configure for Different Environments

### Local Development
```env
NODE_ENV=development
FRONTEND_BASE_URL_DEV=http://localhost:3000
```

### Vercel Preview/Staging
```env
NODE_ENV=staging
FRONTEND_BASE_URL_NONPROD=https://www.fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app
```

### Production
```env
NODE_ENV=production
FRONTEND_BASE_URL_PROD=https://www.carsgidi.com
```

## Important Notes

1. **Always set NODE_ENV explicitly** in your `.env` file to avoid confusion
2. The guest management page exists at `/guest-manage/[token]` and must be deployed on the frontend URL you configure
3. Links are dynamically generated with secure JWT tokens unique to each booking
4. The token includes booking ID, customer email, and last name for validation

## Testing

1. Set `NODE_ENV` in your `.env` file to match your environment
2. Restart the backend server to pick up the new environment variable
3. Create a test booking
4. Check the confirmation email
5. Click "Modify Reservation" or "Cancel Reservation" buttons
6. Verify you're redirected to `/guest-manage/{token}` on the correct domain

## Files Modified

- `backend/.env` - Added NODE_ENV=development with documentation
- `backend/.env.example` - Added NODE_ENV with detailed comments
- `backend/EMAIL_REDIRECT_FIX.md` - This documentation file

## Related Files

- `backend/src/services/bookingService.js` - Contains getFrontendBaseUrl() and buildGuestManageLinks()
- `frontend/app/guest-manage/[token]/page.tsx` - Guest management page
- `backend/BOOKING_EMAIL_FIX.md` - Previous documentation about the link structure

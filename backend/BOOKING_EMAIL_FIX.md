# Booking Confirmation Email - Modify/Cancel Links Fix

## Issue
The modify and cancel reservation buttons in the booking confirmation email were redirecting to the admin login page instead of the guest booking management page.

## Root Cause
The issue was caused by a missing `FRONTEND_BASE_URL` environment variable in the `.env` file. The booking service uses this variable to generate the correct URLs for the modify and cancel links in confirmation emails.

## Solution
Added the `FRONTEND_BASE_URL` environment variable to both `.env` and `.env.example` files with proper documentation.

## How It Works

### Email Link Generation
The booking confirmation email uses the `buildGuestManageLinks()` function in `src/services/bookingService.js` to generate secure, tokenized links:

```javascript
function buildGuestManageLinks(booking) {
  const token = createGuestManageTokenFromBooking(booking);
  const baseUrl = getFrontendBaseUrl(); // Uses FRONTEND_BASE_URL env variable
  const manageBase = `${baseUrl}/guest-manage/${token}`;

  return {
    token,
    manageUrl: manageBase,
    modifyUrl: `${manageBase}?action=modify`,
    cancelUrl: `${manageBase}?action=cancel`,
  };
}
```

### Guest Management Page
The links redirect to `/guest-manage/[token]` which is a public page that:
- Validates the JWT token
- Allows guests to modify reservation dates and vehicle
- Allows guests to cancel their booking
- Does NOT require admin login

### URL Structure
- **Manage URL**: `http://localhost:3000/guest-manage/{token}`
- **Modify URL**: `http://localhost:3000/guest-manage/{token}?action=modify`
- **Cancel URL**: `http://localhost:3000/guest-manage/{token}?action=cancel`

## Configuration

### Development
```env
FRONTEND_BASE_URL=http://localhost:3000
```

### Non-Production (Vercel Preview)
```env
FRONTEND_BASE_URL=https://www.fleet-management-b5xnq3psj-yinkdj1s-projects.vercel.app
```

### Production
```env
FRONTEND_BASE_URL=https://www.carsgidi.com
```

**Important**: Make sure to update the `FRONTEND_BASE_URL` in your `.env` file to match your current environment. The production `.env` file is currently set to `https://www.carsgidi.com`.

## Important Notes

1. **Security**: The links use JWT tokens that include:
   - Booking ID
   - Customer email
   - Customer last name
   - Expiration time (default: 7 days)

2. **Validation**: The guest management page validates:
   - Token authenticity and expiration
   - Customer email and last name match
   - Booking status (only "reserved" bookings can be modified)

3. **Email Templates**: Both custom and default email templates use the same link generation logic via the `{{modifyUrl}}` and `{{cancelUrl}}` placeholders.

## Testing

To test the fix:

1. Ensure `FRONTEND_BASE_URL=http://localhost:3000` is set in `.env`
2. Create a new booking through the public reservation flow
3. Check the confirmation email
4. Click the "Modify Reservation" or "Cancel Reservation" buttons
5. Verify you're redirected to `/guest-manage/{token}` and NOT `/login`

## Files Modified

- `.env` - Added FRONTEND_BASE_URL with documentation
- `.env.example` - Added FRONTEND_BASE_URL with documentation
- `BOOKING_EMAIL_FIX.md` - This documentation file

## Related Files

- `src/services/bookingService.js` - Contains link generation logic
- `frontend/app/guest-manage/[token]/page.tsx` - Guest management page
- `prisma/migrations/seed_booking_confirmation_template/migration.sql` - Email template

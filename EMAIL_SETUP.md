# Email Configuration Setup Guide

This guide will help you configure email notifications for booking confirmations on the `/reserve` page.

## Why You're Not Getting Emails

The email service requires SMTP (email server) configuration. Without it, bookings are created successfully but confirmation emails are not sent.

## Quick Setup (Gmail)

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", enable **2-Step Verification**
4. Follow the prompts to set it up

### Step 2: Generate an App Password

1. After enabling 2FA, go to: https://myaccount.google.com/apppasswords
2. In the "Select app" dropdown, choose **Mail**
3. In the "Select device" dropdown, choose **Other (Custom name)**
4. Enter a name like "Fleet Management App"
5. Click **Generate**
6. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure Backend Environment

1. Open `backend/.env` file
2. Update the SMTP settings with your Gmail credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=your-actual-email@gmail.com
```

**Important:** 
- Use the **App Password** (16 characters, no spaces) for `SMTP_PASS`, NOT your regular Gmail password
- Replace `your-actual-email@gmail.com` with your actual Gmail address

### Step 4: Restart Backend Server

```bash
cd backend
npm start
```

### Step 5: Test Email Sending

1. Go to http://localhost:3000/reserve
2. Complete a test booking
3. Check your email inbox for the confirmation email

## Alternative Email Providers

### Using Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

### Using SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com
2. Create an API key
3. Configure:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@yourdomain.com
```

### Using Mailgun

1. Sign up at https://mailgun.com
2. Get your SMTP credentials
3. Configure:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourdomain.com
```

## Email Features

Once configured, customers will receive emails for:

✅ **Booking Confirmation** - Sent immediately after reservation
✅ **Booking Cancellation** - Sent when booking is cancelled
✅ **Pre-checkout Reminders** - Sent before return date
✅ **Post-checkout Thank You** - Sent after vehicle return

## Troubleshooting

### Problem: "SMTP not configured" message

**Solution:** Verify all SMTP environment variables are set in `.env`:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `SMTP_USER` (optional but recommended)
- `SMTP_PASS` (optional but recommended)

### Problem: "Authentication failed" error

**Solutions:**
1. **For Gmail:** Make sure you're using an App Password, not your regular password
2. **For Gmail:** Ensure 2-Factor Authentication is enabled
3. **For other providers:** Verify your username and password are correct
4. Check if "Less secure app access" needs to be enabled (not recommended)

### Problem: Emails going to spam

**Solutions:**
1. Add your sending email to your contacts
2. Check spam folder and mark as "Not Spam"
3. For production, use a professional email service (SendGrid, Mailgun)
4. Set up SPF, DKIM, and DMARC records for your domain

### Problem: Emails not sending but no error

**Solutions:**
1. Check backend server logs for errors
2. Verify SMTP credentials are correct
3. Test SMTP connection manually
4. Check if your email provider requires additional security settings

## Testing SMTP Configuration

You can test your SMTP configuration with this Node.js script:

```javascript
// test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'your-email@gmail.com',
  subject: 'Test Email',
  text: 'If you receive this, SMTP is working!'
}).then(() => {
  console.log('✅ Email sent successfully!');
}).catch((error) => {
  console.error('❌ Error:', error);
});
```

Run it with: `node test-email.js`

## Security Best Practices

✅ **Never commit `.env` file** - Keep credentials private
✅ **Use App Passwords** - Don't use your main email password
✅ **Enable 2FA** - Add extra security to your email account
✅ **Use environment variables** - Never hardcode credentials
✅ **Rotate passwords regularly** - Change App Passwords periodically
✅ **Use dedicated email service** - For production, use SendGrid/Mailgun

## Production Recommendations

For production deployments:

1. **Use a Professional Email Service:**
   - SendGrid (99,000 free emails/month)
   - Mailgun (5,000 free emails/month)
   - Amazon SES (62,000 free emails/month)

2. **Set Up Email Domain:**
   - Use your own domain (e.g., noreply@yourcompany.com)
   - Configure SPF, DKIM, and DMARC records
   - Verify your domain with the email service

3. **Monitor Email Delivery:**
   - Track bounce rates
   - Monitor spam complaints
   - Set up webhooks for delivery events

4. **Implement Email Templates:**
   - Use HTML templates for better formatting
   - Include company branding
   - Add unsubscribe links (required by law)

## Additional Resources

- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Mailgun Documentation](https://documentation.mailgun.com/)

## Support

If you continue to have issues:
1. Check the backend server console for error messages
2. Verify your email provider's SMTP settings
3. Test with a simple nodemailer script first
4. Consider using a dedicated email service for reliability

---

**Note:** Email configuration is separate from Stripe payment integration. Both need to be configured for full functionality.

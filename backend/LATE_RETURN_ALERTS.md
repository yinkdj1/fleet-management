# Late Return Alert System

## Overview

The monitoring agent now automatically sends email and SMS alerts to customers when their bookings are overdue, based on customizable templates stored in the database.

## How It Works

### 1. **Monitoring Service Detection**
The `tripMonitoringService.js` detects overdue bookings and generates alerts with the following information:
- `lateDays`: Number of days the booking is overdue
- `cumulativeLateFee`: Total late fees accumulated (daily rate × late days)
- `totalAmountDue`: Original booking total + cumulative late fees

### 2. **Email Service Processing**
The `tripMonitoringEmailService.js` processes these alerts and sends notifications:
- Checks if a late return alert has already been sent (deduplication)
- Fetches custom templates from the database (if available)
- Sends both email and SMS notifications
- Marks the alert as sent to prevent duplicates

### 3. **Template System**
Templates are stored in the `NotificationTemplate` table with:
- **Anchor**: `late_return`
- **Channel**: `email` or `sms`
- **Subject**: Email subject line (email only)
- **Body**: Message content with variable placeholders

## Available Template Variables

When creating custom late return templates, you can use these variables:

### Standard Variables
- `{{firstName}}` - Customer's first name
- `{{lastName}}` - Customer's last name
- `{{bookingId}}` - Booking ID number
- `{{vehicle}}` - Vehicle make and model
- `{{plateNumber}}` - Vehicle plate number
- `{{pickup}}` - Pickup date and time
- `{{return}}` - Return date and time
- `{{total}}` - Original booking total amount
- `{{manageUrl}}` - Guest management portal URL
- `{{modifyUrl}}` - Direct link to modify booking
- `{{cancelUrl}}` - Direct link to cancel booking
- `{{supportPhone}}` - Support phone number

### Late Return Specific Variables
- `{{lateDays}}` - Number of days overdue
- `{{cumulativeLateFee}}` - Total late fees accumulated (formatted as currency)
- `{{totalAmountDue}}` - Total amount due including late fees (formatted as currency)

## Example Templates

### Email Template
**Anchor**: `late_return`  
**Channel**: `email`  
**Subject**: `Urgent: Booking #{{bookingId}} is {{lateDays}} days overdue`  
**Body**:
```
Hi {{firstName}},

Your booking #{{bookingId}} for {{vehicle}} is now {{lateDays}} day(s) overdue.

Cumulative late fee: {{cumulativeLateFee}}
Total amount due: {{totalAmountDue}}

Please return the vehicle as soon as possible or extend your booking here: {{modifyUrl}}

Thank you,
Carsgidi Team
```

### SMS Template
**Anchor**: `late_return`  
**Channel**: `sms`  
**Body**:
```
Hi {{firstName}}, your booking #{{bookingId}} is {{lateDays}} day(s) overdue. Late fee: {{cumulativeLateFee}}. Total due: {{totalAmountDue}}. Extend: {{modifyUrl}}
```

## Default Behavior

If no custom template is found, the system uses built-in default messages:

### Default Email
- Subject: `Booking #[ID] - Late Return Alert`
- Includes: Customer name, vehicle info, late days, fees, and extension link

### Default SMS
- Format: `Hi [Name], your booking #[ID] is [X] day(s) overdue. Late fee: $[Amount]. Total due: $[Amount]. Extend: [URL]`

## Deduplication

The system prevents duplicate alerts by:
1. Creating a document marker (`late_return_alert_sent`) when an alert is sent
2. Checking for this marker before sending subsequent alerts
3. Only sending one alert per booking, even if it remains overdue

## Integration with Monitoring Agent

The monitoring agent (`agents/tripMonitoringAgent.js`) calls the email service every 5 minutes:
- Scans for overdue bookings
- Processes late return alerts automatically
- Logs all sent notifications

## Configuration

### Required Environment Variables
- `ADMIN_EMAIL` - Admin email for notifications
- `TWILIO_ACCOUNT_SID` - Twilio account SID (for SMS)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (for SMS)
- `TWILIO_FROM_NUMBER` - Twilio phone number (for SMS)
- `SUPPORT_PHONE` - Support phone number (optional, for templates)

### Database Setup
Templates are managed through the `NotificationTemplate` table in the database. Use the admin interface or direct database access to create/modify templates.

## Testing

To test the late return alert system:

1. Create a booking with a return date in the past
2. Ensure the booking status is `active`
3. Wait for the monitoring agent to run (every 5 minutes)
4. Check logs for `[TripMonitorEmail] Sent late return alert`
5. Verify email and SMS delivery

## Troubleshooting

### Alerts Not Sending
- Check that the booking is `active` and past the return date
- Verify customer has email and/or phone number
- Check SMTP and Twilio configuration
- Review logs for error messages

### Duplicate Alerts
- Check for existing `late_return_alert_sent` document markers
- Verify deduplication logic is working correctly

### Template Not Applied
- Ensure template has `anchor: "late_return"` and `isActive: true`
- Check template channel matches (`email` or `sms`)
- Verify template variables are correctly formatted with `{{variable}}`

## API Endpoints

The late return alert functionality is integrated into:
- `GET /api/trip-monitoring/alerts` - View all alerts including late returns
- The monitoring agent runs automatically every 5 minutes

## Future Enhancements

Potential improvements:
- Multiple alert thresholds (e.g., 1 day, 3 days, 7 days overdue)
- Escalating alert templates based on days overdue
- Admin dashboard for alert history
- Customizable alert frequency

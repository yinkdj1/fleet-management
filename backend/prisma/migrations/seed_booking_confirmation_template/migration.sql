-- Seed default booking confirmation email template
INSERT INTO "NotificationTemplate" (name, channel, subject, body, anchor, timing, "offsetMinutes", "isActive", "createdAt", "updatedAt")
VALUES (
  'Booking Confirmation Email',
  'email',
  'Booking confirmation #{{bookingId}}',
  'Hello {{firstName}},

Your reservation is confirmed. Here are your booking details:

Booking ID: #{{bookingId}}
Vehicle: {{vehicle}} ({{plateNumber}})
Pickup: {{pickup}}
Return: {{return}}
Total: {{total}}

Need to make changes?
Modify Reservation: {{modifyUrl}}
Cancel Reservation: {{cancelUrl}}

Thank you for choosing Carsgidi!',
  'booking_created',
  'exact',
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Seed default booking confirmation SMS template
INSERT INTO "NotificationTemplate" (name, channel, subject, body, anchor, timing, "offsetMinutes", "isActive", "createdAt", "updatedAt")
VALUES (
  'Booking Confirmation SMS',
  'sms',
  '',
  'Hi {{firstName}}, thank you for booking with Carsgidi! Booking #{{bookingId}} is confirmed. {{vehicle}} ({{plateNumber}}). Pickup: {{pickup}}. Return: {{return}}. Total: {{total}}. Manage: {{manageUrl}}',
  'booking_created',
  'exact',
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

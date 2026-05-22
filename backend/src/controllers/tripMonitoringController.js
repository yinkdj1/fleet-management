// Trip Monitoring Controller
const { monitorTrips } = require('../services/tripMonitoringService');
const { processMonitoringEmails } = require('../services/tripMonitoringEmailService');

// GET /api/monitor/trips
// Returns trip monitoring alerts for active bookings (excludes internal alerts)
async function getTripAlerts(req, res) {
  try {
    const alerts = await monitorTrips();
    // Filter out internal alerts (email job flags)
    const publicAlerts = alerts.filter(alert => !alert.internal);
    res.json({ success: true, data: publicAlerts });
  } catch (err) {
    console.error('[TripMonitorController] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to monitor trips', details: err.message });
  }
}

// POST /api/monitor/process-emails
// Background job to process and send monitoring emails
async function processEmails(req, res) {
  try {
    const results = await processMonitoringEmails();
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('[TripMonitorController] Error processing emails:', err);
    res.status(500).json({ success: false, error: 'Failed to process monitoring emails', details: err.message });
  }
}

module.exports = { getTripAlerts, processEmails };

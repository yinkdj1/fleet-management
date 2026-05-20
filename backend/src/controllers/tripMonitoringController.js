// Trip Monitoring Controller
const { monitorTrips } = require('../services/tripMonitoringService');

// GET /api/monitor/trips
// Returns trip monitoring alerts for active bookings
async function getTripAlerts(req, res) {
  try {
    const alerts = await monitorTrips();
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[TripMonitorController] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to monitor trips', details: err.message });
  }
}

module.exports = { getTripAlerts };

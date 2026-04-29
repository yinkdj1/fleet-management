// Trip Monitoring Controller
const { monitorTrips } = require('../services/tripMonitoringService');

// GET /api/monitor/trips
async function getTripAlerts(req, res) {
  try {
    const alerts = await monitorTrips();
    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to monitor trips', details: err.message });
  }
}

module.exports = { getTripAlerts };
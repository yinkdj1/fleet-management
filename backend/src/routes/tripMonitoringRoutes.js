// Trip Monitoring Routes
const express = require('express');
const { getTripAlerts, processEmails } = require('../controllers/tripMonitoringController');

const router = express.Router();

// GET /api/monitor/trips
router.get('/trips', getTripAlerts);

// POST /api/monitor/process-emails
// Background job endpoint - should be called by a cron job or scheduler
router.post('/process-emails', processEmails);

module.exports = router;

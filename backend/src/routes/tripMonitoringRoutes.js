// Trip Monitoring Routes
const express = require('express');
const { getTripAlerts } = require('../controllers/tripMonitoringController');

const router = express.Router();

// GET /api/monitor/trips
router.get('/trips', getTripAlerts);

module.exports = router;

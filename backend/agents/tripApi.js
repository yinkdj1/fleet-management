// Simple Express API for trips
const express = require('express');
const router = express.Router();

// Placeholder: Replace with real DB fetch
const trips = [
  { guest: 'John Doe', car: 'Toyota Camry', pickup: '2026-04-25T10:00', dropoff: '2026-04-26T10:00', status: 'Active', alert: false },
  { guest: 'Jane Smith', car: 'Honda Civic', pickup: '2026-04-24T09:00', dropoff: '2026-04-25T09:00', status: 'Late', alert: true }
];

router.get('/trips', (req, res) => {
  res.json(trips);
});

module.exports = router;

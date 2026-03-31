'use strict';

const express = require('express');
const router = express.Router();
const { verify, receive } = require('../controllers/hubspot.controller');

// GET /webhooks/hubspot — HubSpot challenge + health check
router.get('/', verify);

// POST /webhooks/hubspot — receive deal events
router.post('/', express.json(), receive);

module.exports = router;

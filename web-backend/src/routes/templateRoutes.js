const express = require('express');
const router = express.Router();
const { getAllTemplates } = require('../controllers/templateController');

// Helper route to get templates (public or protected? let's make it public for now or protected)
// Since dashboard needs it and you need to be logged in to see dashboard, let's protect it OR make it public for simulator.
// Simulator is on landing page (public). So let's make it public.

router.get('/', getAllTemplates);

module.exports = router;

const express = require('express');
const InterviewSession = require('../models/InterviewSession');

const router = express.Router();

// Порушення dependency rule: route звертається напряму до model,
// минаючи controller/service.
router.get('/sessions/:id', async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  if (!session) return res.status(404).end();
  res.json(session);
});

module.exports = router;

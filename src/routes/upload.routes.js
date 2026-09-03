const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireCsrf } = require('../middleware/csrf');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { upload, verifyRealImageType, MAX_FILES } = require('../middleware/upload');
const { uploadBuffer } = require('../config/cloudinary');

const router = express.Router();

router.post(
  '/admin/upload',
  requireAuth,
  requireCsrf,
  uploadLimiter,
  upload.array('images', MAX_FILES),
  verifyRealImageType,
  async (req, res, next) => {
    try {
      if (!req.files || !req.files.length) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }
      const results = await Promise.all(req.files.map(f => uploadBuffer(f.buffer)));
      res.json({ urls: results.map(r => r.secure_url) });
    } catch (err) { next(err); }
  }
);

module.exports = router;

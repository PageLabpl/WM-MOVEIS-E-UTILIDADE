const multer = require('multer');
const { fromBuffer } = require('file-type');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por arquivo
const MAX_FILES = 6;

// Armazena em memória (não em disco) — o Render tem sistema de arquivos efêmero,
// e assim evitamos gravar arquivos não confiáveis em disco antes de validar.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    // Primeira barreira: mimetype declarado pelo cliente (pode ser falsificado,
    // por isso a validação real acontece depois, olhando os bytes do arquivo).
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Formato de arquivo não permitido. Envie apenas JPG, PNG ou WEBP.'));
    }
    cb(null, true);
  }
});

/** Segunda barreira, decisiva: inspeciona os primeiros bytes do arquivo
 *  (magic number) para confirmar que é realmente uma imagem, independente
 *  da extensão ou do Content-Type informado pelo cliente. Isso impede o
 *  envio de scripts/executáveis disfarçados de imagem. */
async function verifyRealImageType(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files.length) return next();

    for (const file of files) {
      const type = await fromBuffer(file.buffer);
      if (!type || !ALLOWED_MIME.has(type.mime)) {
        return res.status(400).json({ error: 'Um dos arquivos enviados não é uma imagem válida.' });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, verifyRealImageType, MAX_FILE_SIZE, MAX_FILES };

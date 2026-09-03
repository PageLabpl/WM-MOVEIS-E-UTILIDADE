const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Faz upload de um buffer de imagem já validado para o Cloudinary via stream.
 * Nunca recebe o arquivo bruto do cliente sem antes passar pela validação
 * de tipo real (magic number) feita em middleware/upload.js.
 */
function uploadBuffer(buffer, folder = 'wm-moveis') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: false,
        // Remove metadados EXIF (localização, dispositivo, etc.) por privacidade/segurança
        exif: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer };

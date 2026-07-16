import path from "path";

const ALLOWED_EXTENSIONS = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  document: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp"]
};

const ALLOWED_MIMETYPES = {
  image: ["image/jpeg", "image/png", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp"
  ]
};

/**
 * Validates file upload type (extension and mimetype).
 * @param {Object|Array} files - The file or array of files from express-fileupload.
 * @param {string} type - 'image' or 'document'
 * @returns {Object} - { isValid: boolean, message?: string }
 */
export function validateFile(files, type = "document") {
  if (!files) return { isValid: true };

  const fileArray = Array.isArray(files) ? files : [files];
  const allowedExts = ALLOWED_EXTENSIONS[type] || ALLOWED_EXTENSIONS.document;
  const allowedMimes = ALLOWED_MIMETYPES[type] || ALLOWED_MIMETYPES.document;

  for (const file of fileArray) {
    const ext = path.extname(file.name).toLowerCase();
    
    // Check extension
    if (!allowedExts.includes(ext)) {
      return {
        isValid: false,
        message: `File type not allowed: ${ext}. Supported types: ${allowedExts.join(", ")}`
      };
    }

    // Check mimetype
    if (!allowedMimes.includes(file.mimetype)) {
      return {
        isValid: false,
        message: `Invalid file content type: ${file.mimetype}.`
      };
    }
  }

  return { isValid: true };
}

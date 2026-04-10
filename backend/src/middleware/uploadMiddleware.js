const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    cb(null, `${timestamp}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/originals';

const allowedFormats = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/mkv',
  'video/webm',
  'video/quicktime'
];

const maxSize = parseInt(process.env.MAX_VIDEO_SIZE || '157286400');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedFormats.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only video files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: maxSize
  },
  fileFilter
});

export default upload;

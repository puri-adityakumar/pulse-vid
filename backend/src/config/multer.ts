import multer from 'multer';

const allowedFormats = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/mkv',
  'video/webm',
  'video/quicktime'
];

const maxSize = parseInt(process.env.MAX_VIDEO_SIZE || '157286400');

const storage = multer.memoryStorage();

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

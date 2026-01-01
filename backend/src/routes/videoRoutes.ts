import { Router } from 'express';
import { uploadVideo, getVideos, getVideoById, deleteVideo, streamVideo } from '../controllers/videoController';
import { protect } from '../middleware/authMiddleware';
import { authorize } from '../middleware/roleMiddleware';
import upload from '../config/multer';

const router = Router();

router.post('/upload', protect, authorize('admin', 'editor'), upload.single('video'), uploadVideo);
router.get('/', protect, getVideos);
router.get('/:id', protect, getVideoById);
router.get('/:id/stream', protect, streamVideo);
router.options('/:id/stream', (req, res) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});
router.delete('/:id', protect, authorize('admin', 'editor'), deleteVideo);

export default router;

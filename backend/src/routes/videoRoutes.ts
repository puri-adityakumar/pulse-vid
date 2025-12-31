import { Router } from 'express';
import { uploadVideo, getVideos, getVideoById, deleteVideo, streamVideo } from '../controllers/videoController';
import { protect } from '../middleware/authMiddleware';
import upload from '../config/multer';

const router = Router();

router.post('/upload', protect, upload.single('video'), uploadVideo);
router.get('/', protect, getVideos);
router.get('/:id', protect, getVideoById);
router.get('/:id/stream', protect, streamVideo);
router.delete('/:id', protect, deleteVideo);

export default router;

import { Router } from 'express';
import { getAllUsers, createUser, updateUserRole, deleteUser, getUserStats } from '../controllers/adminController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/users/stats', protect, authorize('admin'), getUserStats);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

export default router;

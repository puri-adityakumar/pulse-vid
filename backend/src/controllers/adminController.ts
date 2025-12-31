import { Request, Response } from 'express';
import User from '../models/User';
import Organization from '../models/Organization';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';

    const query: any = {
      organizationId: req.user.organizationId
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email, organizationId: req.user.organizationId });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists in organization'
      });
      return;
    }

    const user = await User.create({
      email,
      password,
      name,
      role: role || 'viewer',
      organizationId: req.user.organizationId
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { role } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user._id.toString() === req.user.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
      return;
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user._id.toString() === req.user.id) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const totalUsers = await User.countDocuments({ organizationId: req.user.organizationId });
    const admins = await User.countDocuments({ organizationId: req.user.organizationId, role: 'admin' });
    const editors = await User.countDocuments({ organizationId: req.user.organizationId, role: 'editor' });
    const viewers = await User.countDocuments({ organizationId: req.user.organizationId, role: 'viewer' });
    const activeUsers = await User.countDocuments({ organizationId: req.user.organizationId, isActive: true });

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        byRole: {
          admin: admins,
          editor: editors,
          viewer: viewers
        },
        active: activeUsers,
        inactive: totalUsers - activeUsers
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

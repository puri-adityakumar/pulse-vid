import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Organization from '../models/Organization';
import jwt from 'jsonwebtoken';

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ id: userId }, secret, { expiresIn: '24h' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    console.log('Registration attempt:', { email, name });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
      return;
    }

    console.log('Finding or creating organization...');
    let organization = await Organization.findOne({ name: 'Default Organization' });
    if (!organization) {
      console.log('Creating default organization...');
      organization = await Organization.create({ name: 'Default Organization' });
      console.log('Organization created:', organization._id);
    } else {
      console.log('Found organization:', organization._id);
    }

    console.log('Creating user...');
    const user = await User.create({
      email,
      password,
      name,
      organizationId: organization._id
    });

    console.log('User created successfully:', user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed' 
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password') as IUser;
    if (!user || !user.isActive) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
      return;
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized' 
      });
      return;
    }
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user' 
    });
  }
};

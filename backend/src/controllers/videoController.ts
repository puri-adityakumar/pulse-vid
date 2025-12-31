import { Request, Response } from 'express';
import Video, { IVideo } from '../models/Video';
import { extractVideoMetadata } from '../utils/videoMetadata';
import { processingQueue } from '../services/processingQueue';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/originals';

export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;

    console.log('Extracting video metadata for:', fileName);

    let metadata;
    try {
      metadata = await extractVideoMetadata(filePath);
      console.log('Metadata extracted:', metadata);
    } catch (error) {
      console.error('Failed to extract metadata, continuing without it:', error);
      metadata = {};
    }

    const video = await Video.create({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      filename: fileName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadPath: filePath,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      processingStatus: 'pending'
    });

    console.log('Video created in database:', video._id);

    processingQueue.enqueue({
      videoId: video._id.toString(),
      userId: req.user.id,
      inputPath: filePath,
      filename: fileName
    });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully and queued for processing',
      video
    });
  } catch (error) {
    console.error('Upload video error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload video'
    });
  }
};

export const getVideos = async (req: Request, res: Response): Promise<void> => {
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
    const status = req.query.status as string;

    const query: any = {
      userId: req.user.id,
      organizationId: req.user.organizationId
    };

    if (status) {
      query.processingStatus = status;
    }

    const videos = await Video.find(query)
      .sort({ uploadDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
};

export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    if (!video) {
      res.status(404).json({
        success: false,
        message: 'Video not found'
      });
      return;
    }

    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Get video by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video'
    });
  }
};

export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    if (!video) {
      res.status(404).json({
        success: false,
        message: 'Video not found'
      });
      return;
    }

    const filePath = video.uploadPath;

    await Video.findByIdAndDelete(req.params.id);

    const filesToDelete = [filePath];
    if (video.processedPath) {
      filesToDelete.push(video.processedPath);
    }
    if (video.thumbnailPath) {
      filesToDelete.push(video.thumbnailPath);
    }

    filesToDelete.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('File deleted:', file);
      }
    });

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
};

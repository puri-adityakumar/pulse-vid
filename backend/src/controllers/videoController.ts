import { Request, Response } from 'express';
import Video, { IVideo } from '../models/Video';
import { extractVideoMetadata } from '../utils/videoMetadata';
import { processingQueue } from '../services/processingQueue';
import { uploadToSupabase, deleteFromSupabase } from '../services/supabaseStorage';
import fs from 'fs';

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

    const fileBuffer = req.file.buffer;
    const fileName = `${Date.now()}-${req.file.originalname}`;

    console.log('Extracting video metadata for:', fileName);

    let metadata;
    try {
      metadata = await extractVideoMetadata(fileBuffer);
      console.log('Metadata extracted:', metadata);
    } catch (error) {
      console.error('Failed to extract metadata, continuing without it:', error);
      metadata = {};
    }

    const { path: supabasePath, url: supabaseUrl } = await uploadToSupabase(
      fileBuffer,
      fileName,
      process.env.SUPABASE_BUCKET || 'dump'
    );

    const video = await Video.create({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      filename: fileName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadPath: supabasePath,
      supabaseBucket: process.env.SUPABASE_BUCKET || 'dump',
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      processingStatus: 'pending'
    });

    console.log('Video created in database:', video._id);

    processingQueue.enqueue({
      videoId: video._id.toString(),
      userId: req.user.id,
      inputPath: supabasePath,
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
      organizationId: req.user.organizationId
    });

    if (!video) {
      res.status(404).json({
        success: false,
        message: 'Video not found'
      });
      return;
    }

    await Video.findByIdAndDelete(req.params.id);

    if (video.uploadPath) {
      await deleteFromSupabase(video.uploadPath, video.supabaseBucket);
    }
    if (video.processedPath) {
      await deleteFromSupabase(video.processedPath, video.supabaseBucket);
    }
    if (video.thumbnailPath) {
      await deleteFromSupabase(video.thumbnailPath, video.supabaseBucket);
    }

    console.log('Files deleted from Supabase:', video._id);

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

export const streamVideo = async (req: Request, res: Response): Promise<void> => {
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
      organizationId: req.user.organizationId
    });

    if (!video) {
      res.status(404).json({
        success: false,
        message: 'Video not found'
      });
      return;
    }

    if (video.processingStatus !== 'completed') {
      res.status(400).json({
        success: false,
        message: `Video is ${video.processingStatus}. Please wait for processing to complete.`
      });
      return;
    }

    const videoPath = video.processedPath || video.uploadPath;

    const videoUrl = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${video.supabaseBucket}/${videoPath}`;

    res.redirect(videoUrl);
  } catch (error) {
    console.error('Stream video error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to stream video'
      });
    }
  }
};

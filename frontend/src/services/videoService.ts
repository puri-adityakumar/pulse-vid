import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export interface Video {
  _id: string;
  userId: string;
  organizationId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadPath: string;
  processedPath?: string;
  thumbnailPath?: string;
  duration?: number;
  width?: number;
  height?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingProgress?: number;
  processingError?: string;
  uploadDate: string;
}

export interface VideosResponse {
  success: boolean;
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UploadProgressCallback {
  (loaded: number, total: number): void;
}

export const uploadVideo = async (
  file: File,
  onUploadProgress?: UploadProgressCallback
): Promise<{ success: boolean; video: Video; message: string }> => {
  const formData = new FormData();
  formData.append('video', file);

  const response = await axios.post(`${API_URL}/videos/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        onUploadProgress(progressEvent.loaded, progressEvent.total);
      }
    }
  });

  return response.data;
};

export const getVideos = async (
  params?: {
    page?: number;
    limit?: number;
    status?: string;
  }
): Promise<VideosResponse> => {
  const response = await axios.get(`${API_URL}/videos`, { params });
  return response.data;
};

export const getVideoById = async (id: string): Promise<{ success: boolean; video: Video }> => {
  const response = await axios.get(`${API_URL}/videos/${id}`);
  return response.data;
};

export const deleteVideo = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await axios.delete(`${API_URL}/videos/${id}`);
  return response.data;
};

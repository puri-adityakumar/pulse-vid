import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadVideo, getVideoById } from '../services/videoService';
import { useSocket } from '../hooks/useSocket';
import { Upload, X, Film, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';

export default function VideoUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { processingProgress, onProcessingProgress, onProcessingComplete, onProcessingFailed, onProcessingStarted } = useSocket(user?.id);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a video file (MP4, AVI, MOV, MKV, WEBM).');
      return;
    }

    const maxSize = 150 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 150MB limit.');
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setCurrentProgress(0);

    try {
      const response = await uploadVideo(selectedFile);
      setCurrentVideoId(response.video._id);
      setUploading(false);
      setProcessing(true);

      startPolling(response.video._id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload video. Please try again.');
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setCurrentProgress(0);
    setProcessing(false);
  };

  const startPolling = (videoId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await getVideoById(videoId);
        const video = response.video;

        if (video.processingStatus === 'completed') {
          setCurrentProgress(100);
          setProcessing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else if (video.processingStatus === 'failed') {
          setError(`Processing failed: ${video.processingError || 'Unknown error'}`);
          setProcessing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        } else if (video.processingStatus === 'processing' && video.processingProgress > 0) {
          setCurrentProgress(video.processingProgress);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeStarted = onProcessingStarted((data) => {
      if (currentVideoId && data.videoId === currentVideoId) {
        setCurrentProgress(0);
        setProcessing(true);
      }
    });

    const unsubscribeProgress = onProcessingProgress((data) => {
      if (currentVideoId && data.videoId === currentVideoId) {
        setCurrentProgress(data.progress);
      }
    });

    const unsubscribeComplete = onProcessingComplete((data) => {
      console.log('Processing complete event received:', data, 'Current video ID:', currentVideoId);
      if (currentVideoId && data.videoId === currentVideoId) {
        setCurrentProgress(100);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    });

    const unsubscribeFailed = onProcessingFailed((data) => {
      if (currentVideoId && data.videoId === currentVideoId) {
        setError(`Processing failed: ${data.error}`);
        setProcessing(false);
      }
    });

    return () => {
      unsubscribeStarted?.();
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeFailed?.();
    };
  }, [user?.id, onProcessingStarted, onProcessingProgress, onProcessingComplete, onProcessingFailed, navigate, currentVideoId]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Upload className="mr-3 h-8 w-8 text-blue-600" />
            Upload Video
          </h1>
          <p className="mt-2 text-gray-600">
            Upload a video file to process and stream on the platform.
          </p>
        </div>

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input
              type="file"
              accept="video/mp4,video/avi,video/mov,video/mkv,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Film className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {dragOver ? 'Drop your video here' : 'Drag and drop your video here'}
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Browse Files
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: MP4, AVI, MOV, MKV, WEBM (Max 150MB)
              </p>
            </label>
           </div>
         ) : (
           <div className="bg-white rounded-lg shadow-md p-6">
             <div className="flex items-start justify-between mb-6">
               <div className="flex items-start">
                 <div className="bg-blue-100 p-3 rounded-lg mr-4">
                   <FileVideo className="h-8 w-8 text-blue-600" />
                 </div>
                 <div className="flex-1">
                   <h3 className="text-lg font-semibold text-gray-900 mb-1">
                     {selectedFile.name}
                   </h3>
                   <p className="text-sm text-gray-500">
                     {formatFileSize(selectedFile.size)} • {selectedFile.type}
                   </p>
                 </div>
                 {!uploading && !processing && (
                   <button
                     onClick={handleCancel}
                     disabled={uploading || processing}
                     className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                   >
                     <X className="h-6 w-6" />
                   </button>
                 )}
               </div>
             </div>

             <div className="space-y-3">
               {(uploading || processing) && (
                 <div>
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-medium text-gray-700">
                       {uploading ? 'Uploading...' : processing && currentProgress === 0 ? 'Queued for processing...' : `Processing... ${currentProgress}%`}
                     </span>
                     {currentProgress === 100 && (
                       <CheckCircle className="h-5 w-5 text-green-600" />
                     )}
                   </div>
                   <div className="w-full bg-gray-200 rounded-full h-3">
                     <div 
                       className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                       style={{ width: `${currentProgress}%` }}
                     ></div>
                   </div>
                 </div>
               )}

               {!uploading && !processing && (
                 <div className="text-sm text-gray-600">
                   <p className="font-medium mb-1">Ready to upload</p>
                   <p className="text-gray-500">
                     Your video will be processed and available for streaming after upload.
                   </p>
                 </div>
               )}

               {error && (
                 <div className="flex items-start bg-red-50 text-red-700 p-4 rounded-lg">
                   <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                   <p className="text-sm">{error}</p>
                 </div>
               )}

               {!uploading && !processing && (
                 <>
                   <button
                     onClick={handleUpload}
                     className="w-full py-3 px-4 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     Upload Video
                   </button>

                   <button
                     onClick={handleCancel}
                     className="w-full py-3 px-4 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                   >
                     Cancel
                   </button>
                 </>
               )}
             </div>
           </div>
         )}
      </div>
    </div>
  );
}

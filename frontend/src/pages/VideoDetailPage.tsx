import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getVideoById, deleteVideo, Video } from '../services/videoService';
import VideoPlayer from '../components/video/VideoPlayer';
import { ArrowLeft, Calendar, Clock, HardDrive, Film, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    if (!id) {
      setError('Video ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getVideoById(id);
      setVideo(response.video);
    } catch (err: any) {
      console.error('Failed to load video:', err);
      setError(err.response?.data?.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!video) return;

    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteVideo(video._id);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Failed to delete video:', err);
      alert(err.response?.data?.message || 'Failed to delete video. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStreamUrl = () => {
    if (!video) return '';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl}/videos/${video._id}/stream`;
  };

  const getThumbnailUrl = () => {
    if (!video || !video.thumbnailPath) return '';
    const cleanedPath = video.thumbnailPath.startsWith('./uploads')
      ? video.thumbnailPath.replace('./uploads', '/uploads')
      : video.thumbnailPath;
    return 'http://localhost:5000' + cleanedPath;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (video.processingStatus !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {video.processingStatus === 'processing' ? (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            ) : video.processingStatus === 'failed' ? (
              <AlertCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
            ) : (
              <Clock className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
            )}

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Video is {video.processingStatus}
            </h2>

            <p className="text-gray-600 mb-4">
              {video.processingStatus === 'pending' && 'Your video is waiting in the processing queue.'}
              {video.processingStatus === 'processing' && 'Your video is currently being processed. This may take a few minutes.'}
              {video.processingStatus === 'failed' && `Failed to process video: ${video.processingError || 'Unknown error'}`}
            </p>

            {video.processingProgress > 0 && video.processingProgress < 100 && (
              <div className="max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Processing: {video.processingProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${video.processingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete Video'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <VideoPlayer
                src={getStreamUrl()}
                title={video.originalName}
                thumbnail={getThumbnailUrl()}
                onError={(error) => {
                  console.error('Video player error:', error);
                }}
                onLoad={() => {
                  console.log('Video loaded successfully');
                }}
              />
            </div>

            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.originalName}</h1>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(video.processingStatus)}`}>
                  {video.processingStatus === 'completed' && <CheckCircle className="mr-1 h-3 w-3" />}
                  {video.processingStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Information</h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload Date</p>
                    <p className="text-sm text-gray-600">{formatDate(video.uploadDate)}</p>
                  </div>
                </div>

                {video.duration && (
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Duration</p>
                      <p className="text-sm text-gray-600">{formatDuration(video.duration)}</p>
                    </div>
                  </div>
                )}

                {video.width && video.height && (
                  <div className="flex items-start">
                    <Film className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Resolution</p>
                      <p className="text-sm text-gray-600">{video.width}x{video.height}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start">
                  <HardDrive className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">File Size</p>
                    <p className="text-sm text-gray-600">{formatFileSize(video.size)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Film className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Format</p>
                    <p className="text-sm text-gray-600">{video.mimeType}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(video.processingStatus)}`}>
                    {video.processingStatus}
                  </span>
                </div>
                {video.processingProgress !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{video.processingProgress}%</span>
                  </div>
                )}
                {video.processingError && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error</span>
                    <span className="text-red-600">{video.processingError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

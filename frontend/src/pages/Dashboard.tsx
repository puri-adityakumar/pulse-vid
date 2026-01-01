import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getVideos, deleteVideo, Video } from '../services/videoService';
import { useSocket } from '../hooks/useSocket';
import RoleGuard from '../components/auth/RoleGuard';
import {
  LogOut, Video as VideoIcon, Upload, Trash2, Film,
  Clock, HardDrive, Filter, Plus, Wifi, WifiOff, Play, Users, Shield, Search
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout, canEdit, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { isConnected, processingProgress, onProcessingProgress, onProcessingComplete, onProcessingFailed } = useSocket(user?.id);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'largest' | 'smallest'>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getThumbnailUrl = (video: Video) => {
    if (!video.thumbnailPath) return null;
    const cleanedPath = video.thumbnailPath.startsWith('./uploads')
      ? video.thumbnailPath.replace('./uploads', '/uploads')
      : video.thumbnailPath;
    return 'http://localhost:5000' + cleanedPath;
  };

  const handleVideoClick = (videoId: string) => {
    navigate(`/videos/${videoId}`);
  };

  useEffect(() => {
    loadVideos();
  }, [statusFilter, search, sortBy]);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribeProgress = onProcessingProgress((data) => {
      setVideos(prevVideos => 
        prevVideos.map(v => 
          v._id === data.videoId 
            ? { ...v, processingProgress: data.progress }
            : v
        )
      );
    });

    const unsubscribeComplete = onProcessingComplete((data) => {
      loadVideos();
    });

    const unsubscribeFailed = onProcessingFailed((data) => {
      setVideos(prevVideos => 
        prevVideos.map(v => 
          v._id === data.videoId 
            ? { ...v, processingStatus: 'failed' as const, processingError: data.error }
            : v
        )
      );
    });

    return () => {
      unsubscribeProgress?.();
      unsubscribeComplete?.();
      unsubscribeFailed?.();
    };
  }, [user?.id, onProcessingProgress, onProcessingComplete, onProcessingFailed]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await getVideos(params);
      let filteredVideos = response.videos;

      if (search) {
        const searchLower = search.toLowerCase();
        filteredVideos = filteredVideos.filter(v =>
          v.originalName.toLowerCase().includes(searchLower)
        );
      }

      filteredVideos = filteredVideos.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
          case 'oldest':
            return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          case 'largest':
            return b.size - a.size;
          case 'smallest':
            return a.size - b.size;
          default:
            return 0;
        }
      });

      setVideos(filteredVideos);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteVideo(id);
      setVideos(videos.filter(v => v._id !== id));
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string, hasError?: boolean) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: hasError ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      editor: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || colors.viewer;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <VideoIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Video Platform</span>
            </div>
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" title="Connected" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" title="Disconnected" />
              )}
              <span className="text-gray-700">{user?.name}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user?.role || 'viewer')}`}>
                {user?.role}
              </span>
              <RoleGuard allowedRoles={['admin']}>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-purple-600 hover:text-purple-900 hover:bg-purple-50"
                  title="Manage Users"
                >
                  <Users className="h-5 w-5 mr-1" />
                  <Shield className="h-5 w-5" />
                </button>
              </RoleGuard>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Videos
            </h1>
            <p className="mt-1 text-gray-600">
              Manage your uploaded videos
            </p>
          </div>
          <RoleGuard allowedRoles={['admin', 'editor']}>
            <button
              onClick={() => navigate('/upload')}
              className="mt-4 sm:mt-0 flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Upload Video
            </button>
          </RoleGuard>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="all">All Videos</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <label htmlFor="sort-filter" className="text-sm font-medium text-gray-700 ml-4">
              Sort by:
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'largest' | 'smallest')}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="largest">Largest</option>
              <option value="smallest">Smallest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
         ) : videos.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-lg shadow">
             <Film className="mx-auto h-16 w-16 text-gray-400 mb-4" />
             <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
             <p className="text-gray-500 mb-6">
               {canEdit() ? 'Upload your first video to get started' : 'Wait for an editor or admin to upload videos'}
             </p>
             <RoleGuard allowedRoles={['admin', 'editor']}>
               <button
                 onClick={() => navigate('/upload')}
                 className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
               >
                 <Upload className="h-5 w-5 mr-2" />
                 Upload Your First Video
               </button>
             </RoleGuard>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {videos.map((video) => {
               const thumbnailUrl = getThumbnailUrl(video);
               return (
                 <div
                   key={video._id}
                   className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                   onClick={() => handleVideoClick(video._id)}
                 >
                   {thumbnailUrl ? (
                     <div className="aspect-video bg-gray-100">
                       <img
                         src={thumbnailUrl}
                         alt={video.originalName}
                         className="w-full h-full object-cover"
                         onError={(e) => {
                           (e.target as HTMLImageElement).style.display = 'none';
                         }}
                       />
                     </div>
                   ) : (
                     <div className="aspect-video bg-gray-100 flex items-center justify-center">
                       <Film className="h-12 w-12 text-gray-400" />
                     </div>
                   )}

                   <div className="p-6">
                     <div className="flex items-start justify-between mb-4">
                       <div className="flex-1">
                         <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">
                           {video.originalName}
                         </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(video.processingStatus, !!video.processingError)}`}>
                           {video.processingStatus}
                         </span>
                         {video.processingStatus === 'processing' && video.processingProgress > 0 && (
                           <span className="ml-2 text-xs text-blue-600">
                             {video.processingProgress}%
                           </span>
                         )}
                        </div>
                        <RoleGuard allowedRoles={['admin', 'editor']}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(video._id);
                            }}
                            disabled={deletingId === video._id}
                            className="text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </RoleGuard>
                      </div>

                     <div className="space-y-2 text-sm text-gray-600">
                       <div className="flex items-center">
                         <HardDrive className="h-4 w-4 mr-2 flex-shrink-0" />
                         <span>Size: {formatFileSize(video.size)}</span>
                       </div>
                       {video.duration && (
                         <div className="flex items-center">
                           <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                           <span>Duration: {formatDuration(video.duration)}</span>
                         </div>
                       )}
                       {video.width && video.height && (
                         <div className="flex items-center">
                           <Film className="h-4 w-4 mr-2 flex-shrink-0" />
                           <span>Resolution: {video.width}x{video.height}</span>
                         </div>
                       )}
                       <div className="flex items-center">
                         <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                         <span>Uploaded: {formatDate(video.uploadDate)}</span>
                       </div>
                      </div>

                      {video.processingStatus === 'completed' && video.processingError && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700 border border-yellow-200">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.processingError}
                          </div>
                        </div>
                      )}

                    {video.processingStatus === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                          <Play className="h-4 w-4 mr-2" />
                          Watch Video
                        </div>
                      </div>
                    )}
                  </div>
                </div>
             );
             })}
           </div>
         )}
      </main>
    </div>
  );
}

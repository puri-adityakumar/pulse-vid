import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import VideoUploadPage from './pages/VideoUploadPage';
import VideoDetailPage from './pages/VideoDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import CreateUserPage from './pages/CreateUserPage';
import { Video, LogIn, UserPlus } from 'lucide-react';

function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 text-center">
        <Video className="mx-auto h-20 w-20 text-blue-600 mb-6" />
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Video Platform</h1>
        <p className="mt-4 text-xl text-gray-600 mb-8">
          Upload, process, and stream videos with ease
        </p>
        
        {!user && (
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => window.location.href = '/login'}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Login
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <VideoUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/videos/:id"
            element={
              <ProtectedRoute>
                <VideoDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/create"
            element={
              <ProtectedRoute>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

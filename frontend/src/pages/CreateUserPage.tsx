import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import RoleGuard from '../components/auth/RoleGuard';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { ArrowLeft, UserPlus, Shield } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function CreateUserPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'viewer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.name) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/admin/users`, formData);
      navigate('/admin/users');
    } catch (err: any) {
      console.error('Create user error:', err);
      setError(err.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </button>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <RoleGuard allowedRoles={['admin']}>
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-8">
                <UserPlus className="mx-auto h-16 w-16 text-purple-600 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900">Create New User</h1>
                <p className="mt-2 text-gray-600">
                  Add a new user to your organization
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Full Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                />

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="•••••••••"
                  minLength={6}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="viewer">Viewer - Can view videos only</option>
                    <option value="editor">Editor - Can upload and manage videos</option>
                    <option value="admin">Admin - Full access including user management</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the appropriate access level for this user
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create User
                </Button>
              </form>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Role Permissions
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Viewer:</strong> Can only watch videos</li>
                <li>• <strong>Editor:</strong> Can upload, edit, and delete videos</li>
                <li>• <strong>Admin:</strong> Full access including user management</li>
              </ul>
            </div>
          </RoleGuard>

          {!isAdmin && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                You don't have permission to create users. Admin access is required.
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

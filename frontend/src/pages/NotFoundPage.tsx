import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6 text-6xl font-bold text-blue-600">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            <Home className="mr-2 h-5 w-5" />
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(-1 as any)}
            className="w-full"
          >
            <Search className="mr-2 h-5 w-5" />
            Search Videos
          </Button>
        </div>
      </div>
    </div>
  );
}

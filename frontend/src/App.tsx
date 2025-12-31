import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<div className="p-8 text-center">
            <h1 className="text-4xl font-bold text-blue-600">Video Platform</h1>
            <p className="mt-4 text-gray-600">Setup Complete!</p>
          </div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

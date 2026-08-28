import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Round1 from './pages/Round1';
import Round2 from './pages/Round2';
import RoundResult from './pages/RoundResult';
import FinalResult from './pages/FinalResult';
import Leaderboard from './pages/Leaderboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import DisqualifiedPage from './pages/DisqualifiedPage';
import Navbar from './components/Navbar';
import AntiCheatProvider from './components/AntiCheatProvider';

function ProtectedRoute({ children }) {
  const { student, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading...</p></div>;
  if (!student) return <Navigate to="/login" replace />;
  
  // If disqualified, only allow access to leaderboard or disqualified page
  if (student.disqualified && location.pathname !== '/leaderboard' && location.pathname !== '/disqualified') {
      return <Navigate to="/disqualified" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { student } = useAuth();
  const location = useLocation();
  
  return (
    <Routes>
      <Route path="/login" element={student ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Navbar /><Dashboard /></ProtectedRoute>} />
      <Route path="/round/1" element={<ProtectedRoute><Navbar /><Round1 /></ProtectedRoute>} />
      <Route path="/round/2" element={<ProtectedRoute><Navbar /><Round2 /></ProtectedRoute>} />
      <Route path="/round/:roundNumber/result" element={<ProtectedRoute><Navbar /><RoundResult /></ProtectedRoute>} />
      <Route path="/result" element={<ProtectedRoute><Navbar /><FinalResult /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Navbar /><Leaderboard /></ProtectedRoute>} />
      <Route path="/disqualified" element={<ProtectedRoute><DisqualifiedPage /></ProtectedRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route path="/" element={<Navigate to={student ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AntiCheatProvider>
          <AppRoutes />
        </AntiCheatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

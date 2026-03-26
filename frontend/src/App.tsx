import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Shell from './components/Shell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PlannerDashboard from './pages/PlannerDashboard';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import FitnessDashboard from './pages/FitnessDashboard';
import BrandingDashboard from './pages/BrandingDashboard';
import HistoryPage from './pages/HistoryPage';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface-900)' }}>
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // Admins can access everything; other roles must match allowedRoles
  if (!allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Shell>{children}</Shell>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute allowedRoles={['PLANNER']}><PlannerDashboard /></ProtectedRoute>} />
          <Route path="/planner/history" element={<ProtectedRoute allowedRoles={['PLANNER']}><HistoryPage /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute allowedRoles={['MAINTENANCE']}><MaintenanceDashboard /></ProtectedRoute>} />
          <Route path="/fitness" element={<ProtectedRoute allowedRoles={['FITNESS']}><FitnessDashboard /></ProtectedRoute>} />
          <Route path="/branding" element={<ProtectedRoute allowedRoles={['BRANDING']}><BrandingDashboard /></ProtectedRoute>} />

          <Route path="/unauthorized" element={
            <div className="h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--color-surface-900)' }}>
              <p className="text-red-400 text-lg font-semibold">Unauthorized Access</p>
              <a href="/login" className="mt-3 text-sm text-slate-400 hover:text-white">Back to login</a>
            </div>
          } />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

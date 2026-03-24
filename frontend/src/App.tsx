import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PlannerDashboard from './pages/PlannerDashboard';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import FitnessDashboard from './pages/FitnessDashboard';
import BrandingDashboard from './pages/BrandingDashboard';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins can access everything. Other roles must match allowedRoles.
  if (!allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute allowedRoles={['PLANNER']}><PlannerDashboard /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute allowedRoles={['MAINTENANCE']}><MaintenanceDashboard /></ProtectedRoute>} />
          <Route path="/fitness" element={<ProtectedRoute allowedRoles={['FITNESS']}><FitnessDashboard /></ProtectedRoute>} />
          <Route path="/branding" element={<ProtectedRoute allowedRoles={['BRANDING']}><BrandingDashboard /></ProtectedRoute>} />
          
          <Route path="/unauthorized" element={<div className="p-8 text-center text-red-600">Unauthorized Access</div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

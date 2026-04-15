import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, AuthContext } from "./context/AuthContext";

import Shell from "./components/Shell";

import Landing from "./pages/Landing";
import Login from "./pages/Login";

import AdminDashboard from "./pages/AdminDashboard";
import PlannerDashboard from "./pages/PlannerDashboard";

import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import FitnessDashboard from "./pages/FitnessDashboard";
import BrandingDashboard from "./pages/BrandingDashboard";
import CleaningDashboard from "./pages/CleaningDashboard";
import OperationsDashboard from "./pages/OperationsDashboard";

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ADMIN can access all
  const role = user.role?.toUpperCase();

  if (role !== "ADMIN" && !allowedRoles.includes(role)) {
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

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* PLANNER */}
          <Route
            path="/planner"
            element={
              <ProtectedRoute allowedRoles={["PLANNER"]}>
                <PlannerDashboard />
              </ProtectedRoute>
            }
          />

          {/* DEPARTMENTS */}

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute allowedRoles={["MAINTENANCE"]}>
                <MaintenanceDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cleaning"
            element={
              <ProtectedRoute allowedRoles={["CLEANING"]}>
                <CleaningDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fitness"
            element={
              <ProtectedRoute allowedRoles={["FITNESS"]}>
                <FitnessDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/branding"
            element={
              <ProtectedRoute allowedRoles={["BRANDING"]}>
                <BrandingDashboard />
              </ProtectedRoute>
            }
          />

          {/* OCR FIXED ROLE */}
          <Route
            path="/operations"
            element={
              <ProtectedRoute allowedRoles={["OCR", "OPERATIONS"]}>
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />

          {/* UNAUTHORIZED */}
          <Route
            path="/unauthorized"
            element={
              <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
                <p className="text-red-400 text-xl font-semibold">
                  Unauthorized Access
                </p>

                <a
                  href="/login"
                  className="mt-3 text-slate-400 hover:text-white"
                >
                  Back to Login
                </a>
              </div>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

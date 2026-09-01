import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { TerritoryWarRoom } from './pages/TerritoryWarRoom';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CoachHubPage } from './pages/CoachHubPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { SimulateRunModal } from './components/activity/SimulateRunModal';
import { LogRunModal } from './components/activity/LogRunModal';
import { GPXUploadModal } from './components/activity/GPXUploadModal';
import { LiveRunModal } from './components/tracker/LiveRunModal';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [liveTrackerOpen, setLiveTrackerOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [gpxOpen, setGpxOpen] = useState(false);

  const isAuthOrLandingPage = ['/login', '/register', '/forgot-password', '/reset-password', '/landing'].includes(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center text-chalk-muted font-sans text-xs">
        Initializing RunZone…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night text-chalk flex flex-col font-sans">
      {!isAuthOrLandingPage && (
        <Navbar
          onOpenLiveTracker={() => setLiveTrackerOpen(true)}
          onOpenSimulate={() => setSimulateOpen(true)}
          onOpenManual={() => setManualOpen(true)}
          onOpenGPX={() => setGpxOpen(true)}
        />
      )}

      <div className="flex flex-1">
        {!isAuthOrLandingPage && <Sidebar />}

        <main className="flex-1 bg-night overflow-y-auto">
          <ErrorBoundary fallbackTitle="Page Load Error" fallbackMessage="An error occurred while rendering this view. Your session and activity data are safe.">
            <Routes>
              {/* Public Routes */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Authenticated Routes or Redirect to Landing */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Dashboard
                      onOpenSimulate={() => setSimulateOpen(true)}
                      onOpenManual={() => setManualOpen(true)}
                      onOpenGPX={() => setGpxOpen(true)}
                    />
                  ) : (
                    <Navigate to="/landing" replace />
                  )
                }
              />

              <Route element={<ProtectedRoute />}>
                <Route
                  path="/territories"
                  element={
                    <TerritoryWarRoom
                      onOpenLiveTracker={() => setLiveTrackerOpen(true)}
                      onOpenSimulate={() => setSimulateOpen(true)}
                      onOpenGPX={() => setGpxOpen(true)}
                    />
                  }
                />
                <Route path="/map" element={<Navigate to="/territories" replace />} />
                <Route path="/territory" element={<Navigate to="/territories" replace />} />
                <Route path="/warroom" element={<Navigate to="/territories" replace />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/coach" element={<CoachHubPage />} />
                <Route
                  path="/activities"
                  element={
                    <ActivitiesPage
                      onOpenSimulate={() => setSimulateOpen(true)}
                      onOpenManual={() => setManualOpen(true)}
                      onOpenGPX={() => setGpxOpen(true)}
                    />
                  }
                />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Activity Modals */}
      <LiveRunModal
        isOpen={liveTrackerOpen}
        onClose={() => setLiveTrackerOpen(false)}
        onRunSaved={() => window.location.reload()}
      />
      <SimulateRunModal
        isOpen={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        onSuccess={() => window.location.reload()}
      />
      <LogRunModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        onSuccess={() => window.location.reload()}
      />
      <GPXUploadModal
        isOpen={gpxOpen}
        onClose={() => setGpxOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* PWA Mobile Install Prompt */}
      <PWAInstallBanner />

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1B2023',
            color: '#EDEEE7',
            border: '1px solid rgba(237, 238, 231, 0.14)',
            borderRadius: '2px',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            padding: '10px 14px',
          },
          success: {
            iconTheme: {
              primary: '#3E8E7E',
              secondary: '#1B2023',
            },
          },
          error: {
            iconTheme: {
              primary: '#C1432E',
              secondary: '#1B2023',
            },
          },
        }}
      />
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ServicesProvider } from './contexts/ServicesContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationContainer } from './components/NotificationContainer';
import { Layout } from './components/Layout';

// Lazy load page components
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReleaseDetailPage = lazy(() => import('./pages/ReleaseDetailPage').then(m => ({ default: m.ReleaseDetailPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const HealthPage = lazy(() => import('./pages/HealthPage').then(m => ({ default: m.HealthPage })));
const ConfigManagementPage = lazy(() => import('./pages/ConfigManagementPage').then(m => ({ default: m.ConfigManagementPage })));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ServicesProvider>
            <NotificationProvider>
              <NotificationContainer />
              <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <DashboardPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/releases/:id"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <ReleaseDetailPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <HistoryPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/health"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <HealthPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/configs"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <ConfigManagementPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/teams"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <TeamManagementPage />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </ServicesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

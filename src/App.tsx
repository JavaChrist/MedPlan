import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import AddTreatment from './pages/AddTreatment';
import Profile from './pages/Profile';
import ManageTreatments from './pages/ManageTreatments';
import ManageSubjects from './pages/ManageSubjects';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />

          {/* Routes protégées */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/add-treatment" element={
            <ProtectedRoute>
              <AddTreatment />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/manage-treatments" element={
            <ProtectedRoute>
              <Layout>
                <ManageTreatments />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/subjects" element={
            <ProtectedRoute>
              <Layout>
                <ManageSubjects />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
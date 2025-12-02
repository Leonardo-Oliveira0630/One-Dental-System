import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { JobsList } from './pages/JobsList';
import { Catalog } from './pages/store/Catalog';
import { Cart } from './pages/store/Cart';
import { IncomingOrders } from './pages/IncomingOrders';
import { NewJob } from './pages/NewJob';
import { JobTypes } from './pages/JobTypes';
import { Admin } from './pages/Admin';
import { JobDetails } from './pages/JobDetails';
import { PromisedJobs } from './pages/PromisedJobs';
import { ProductionCalendar } from './pages/ProductionCalendar';
import { Profile } from './pages/Profile';

// Auth Guard
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Protected Lab Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/new-job" element={<ProtectedRoute><NewJob /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobsList /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><ProductionCalendar /></ProtectedRoute>} />
      <Route path="/incoming" element={<ProtectedRoute><IncomingOrders /></ProtectedRoute>} />
      
      <Route path="/promised" element={<ProtectedRoute><PromisedJobs /></ProtectedRoute>} />

      <Route path="/job-types" element={<ProtectedRoute><JobTypes /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Protected Store Routes */}
      <Route path="/store" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
      <Route path="/my-orders" element={<ProtectedRoute><JobsList /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AppProvider>
  );
}

export default App;
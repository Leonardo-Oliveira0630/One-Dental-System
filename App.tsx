
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
import { Commissions } from './pages/Commissions';
import { PromisedJobs } from './pages/PromisedJobs';
import { ProductionCalendar } from './pages/ProductionCalendar';
import { Profile } from './pages/Profile';
import { Subscribe } from './pages/Subscribe';

// Novos imports para rotas faltantes
import { RegisterOrganization } from './pages/RegisterOrganization';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { Plans } from './pages/superadmin/Plans';
import { Coupons } from './pages/superadmin/Coupons';
import { Patients } from './pages/clinic/Patients';
import { Schedule } from './pages/clinic/Schedule';
import { ClinicSettings } from './pages/clinic/ClinicSettings';
import { Partnerships } from './pages/dentist/Partnerships';

import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, isLoadingAuth } = useApp();
  
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/" element={<Login />} />
      <Route path="/register-lab" element={<RegisterOrganization />} />

      {/* Rotas Protegidas (Laboratório e Comum) */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/new-job" element={<ProtectedRoute><NewJob /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobsList /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
      <Route path="/promised" element={<ProtectedRoute><PromisedJobs /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><ProductionCalendar /></ProtectedRoute>} />
      <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
      <Route path="/incoming-orders" element={<ProtectedRoute><IncomingOrders /></ProtectedRoute>} />
      <Route path="/job-types" element={<ProtectedRoute><JobTypes /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />

      {/* Rotas da Loja (Dentista) */}
      <Route path="/store" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/dentist/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />

      {/* Rotas de Gestão Clínica (Dentista) */}
      <Route path="/my-patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/clinic-settings" element={<ProtectedRoute><ClinicSettings /></ProtectedRoute>} />

      {/* Rotas Super Admin */}
      <Route path="/superadmin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
      <Route path="/superadmin/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />

      {/* Redirecionamento Wildcard */}
      <Route path="*" element={<Navigate to="/" replace />} />
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

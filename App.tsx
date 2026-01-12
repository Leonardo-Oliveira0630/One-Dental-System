
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
import { JobDetails } from './pages/JobDetails';
import { Commissions } from './pages/Commissions';
import { Profile } from './pages/Profile';
import { ProductionCalendar } from './pages/ProductionCalendar';
import { PromisedJobs } from './pages/PromisedJobs';
import { Subscribe } from './pages/Subscribe';
import { RegisterOrganization } from './pages/RegisterOrganization';
import { Patients } from './pages/clinic/Patients';
import { Schedule } from './pages/clinic/Schedule';
import { ClinicSettings } from './pages/clinic/ClinicSettings';
import { Partnerships } from './pages/dentist/Partnerships';
import { Dentists } from './pages/lab/Dentists';
import { Finance } from './pages/lab/Finance';
import { RoutePlanner } from './pages/lab/RoutePlanner';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { Plans } from './pages/superadmin/Plans';
import { Coupons } from './pages/superadmin/Coupons';
import { Loader2 } from 'lucide-react';

import { AdminLayout } from './pages/admin/AdminLayout';
import { SectorsTab } from './pages/admin/SectorsTab';
import { UsersTab } from './pages/admin/UsersTab';
import { DentistsTab } from './pages/admin/DentistsTab';
import { CommissionsTab } from './pages/admin/CommissionsTab';
import { FinancialTab } from './pages/admin/FinancialTab';
import { SubscriptionTab } from './pages/admin/SubscriptionTab';
import { OrganizationTab } from './pages/admin/OrganizationTab';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, isLoadingAuth } = useApp();
  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 text-blue-600 animate-spin" /></div>;
  if (!currentUser) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register-lab" element={<RegisterOrganization />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/new-job" element={<ProtectedRoute><NewJob /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobsList /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
      <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
      <Route path="/incoming-orders" element={<ProtectedRoute><IncomingOrders /></ProtectedRoute>} />
      <Route path="/job-types" element={<ProtectedRoute><JobTypes /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="organizacao" replace />} />
        <Route path="organizacao" element={<OrganizationTab />} />
        <Route path="setores" element={<SectorsTab />} />
        <Route path="equipe" element={<UsersTab />} />
        <Route path="clientes" element={<DentistsTab />} />
        <Route path="comissoes" element={<CommissionsTab />} />
        <Route path="pagamentos" element={<FinancialTab />} />
        <Route path="assinatura" element={<SubscriptionTab />} />
      </Route>

      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      <Route path="/lab/dentists" element={<ProtectedRoute><Dentists /></ProtectedRoute>} />
      <Route path="/lab/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
      <Route path="/lab/logistics" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />

      <Route path="/store" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/clinic-settings" element={<ProtectedRoute><ClinicSettings /></ProtectedRoute>} />
      <Route path="/dentist/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />

      <Route path="/calendar" element={<ProtectedRoute><ProductionCalendar /></ProtectedRoute>} />
      <Route path="/promised" element={<ProtectedRoute><PromisedJobs /></ProtectedRoute>} />
      <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />

      <Route path="/superadmin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/superadmin/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
      <Route path="/superadmin/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
      
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

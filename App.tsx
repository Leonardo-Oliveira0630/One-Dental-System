
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
import { Patients } from './pages/clinic/Patients';
import { Schedule } from './pages/clinic/Schedule';
import { Partnerships } from './pages/dentist/Partnerships'; // New Import
import { Loader2 } from 'lucide-react';
import { RegisterOrganization } from './pages/RegisterOrganization';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { UserRole } from './types';

const AuthGuard = ({ children, roles }: { children: React.ReactNode, roles: UserRole[] }) => {
  const { currentUser, isLoadingAuth } = useApp();
  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 text-blue-600 animate-spin" /></div>;
  if (!currentUser) return <Navigate to="/" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to={currentUser.role === UserRole.SUPER_ADMIN ? "/superadmin" : "/dashboard"} replace />;
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  const { currentUser } = useApp();
  const labRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.COLLABORATOR];
  const clientRoles = [UserRole.CLIENT];

  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register-lab" element={<RegisterOrganization />} />
      
      {/* Super Admin Route */}
      <Route path="/superadmin" element={<AuthGuard roles={[UserRole.SUPER_ADMIN]} children={<SuperAdminDashboard />} />} />

      {/* Lab Routes */}
      <Route path="/dashboard" element={<AuthGuard roles={labRoles} children={<Dashboard />} />} />
      <Route path="/new-job" element={<AuthGuard roles={labRoles} children={<NewJob />} />} />
      <Route path="/jobs" element={<AuthGuard roles={labRoles} children={<JobsList />} />} />
      <Route path="/jobs/:id" element={<AuthGuard roles={labRoles} children={<JobDetails />} />} />
      <Route path="/calendar" element={<AuthGuard roles={labRoles} children={<ProductionCalendar />} />} />
      <Route path="/incoming" element={<AuthGuard roles={labRoles} children={<IncomingOrders />} />} />
      <Route path="/promised" element={<AuthGuard roles={labRoles} children={<PromisedJobs />} />} />
      <Route path="/job-types" element={<AuthGuard roles={labRoles} children={<JobTypes />} />} />
      <Route path="/admin" element={<AuthGuard roles={[UserRole.ADMIN, UserRole.MANAGER]} children={<Admin />} />} />
      <Route path="/profile" element={<AuthGuard roles={[...labRoles, ...clientRoles]} children={<Profile />} />} />

      {/* Store & Clinic Routes (for Clients) */}
      <Route path="/store" element={<AuthGuard roles={clientRoles} children={<Catalog />} />} />
      <Route path="/my-orders" element={<AuthGuard roles={clientRoles} children={<JobsList />} />} />
      <Route path="/cart" element={<AuthGuard roles={clientRoles} children={<Cart />} />} />
      <Route path="/clinic/patients" element={<AuthGuard roles={clientRoles} children={<Patients />} />} />
      <Route path="/clinic/schedule" element={<AuthGuard roles={clientRoles} children={<Schedule />} />} />
      
      {/* New Partnerships Route */}
      <Route path="/dentist/partnerships" element={<AuthGuard roles={clientRoles} children={<Partnerships />} />} />
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

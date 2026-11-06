import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { JobsList } from './pages/JobsList';
import { JobDetails } from './pages/JobDetails';
import { NewJob } from './pages/NewJob';
import { JobTypes } from './pages/JobTypes';
import Reports from './pages/Reports';
import { Commissions } from './pages/Commissions';
import { IncomingOrders } from './pages/IncomingOrders';
import { IncomingRequisitions } from './pages/lab/IncomingRequisitions';
import { Finance } from './pages/lab/Finance';
import { Receipts } from './pages/lab/Receipts';
import { Dentists } from './pages/lab/Dentists';
import { PriceTables } from './pages/lab/PriceTables';
import { Inventory } from './pages/lab/Inventory';
import { Kanban } from './pages/lab/Kanban';
import { RoutePlanner } from './pages/lab/RoutePlanner';
import { PromisedJobs } from './pages/PromisedJobs';
import { ProductionCalendar } from './pages/ProductionCalendar';
import { MonitoringPage } from './pages/MonitoringPage';
import { TutorialsView } from './pages/TutorialsView';
import { Patients } from './pages/clinic/Patients';
import { Schedule } from './pages/clinic/Schedule';
import { ClinicFinance } from './pages/clinic/ClinicFinance';
import { RoomsManagement } from './pages/clinic/RoomsManagement';
import { DentistsManagement } from './pages/clinic/DentistsManagement';
import { ClinicServices } from './pages/clinic/ClinicServices';
import { ClinicInventory } from './pages/clinic/ClinicInventory';
import { ClinicTeam } from './pages/clinic/ClinicTeam';
import { ClinicSettings } from './pages/clinic/ClinicSettings';
import { DentistCases } from './pages/dentist/DentistCases';
import { DentistRequisitions } from './pages/dentist/DentistRequisitions';
import { Partnerships } from './pages/dentist/Partnerships';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { UnifiedStore } from './pages/store/UnifiedStore';
import { Cart } from './pages/store/Cart';
import { SupplierDashboard } from './pages/supplier/Dashboard';
import { SupplierProducts } from './pages/supplier/Products';
import { SupplierCoupons } from './pages/supplier/Coupons';
import { SupplierSettings } from './pages/supplier/Settings';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { NfcKitsAdmin } from './pages/superadmin/NfcKitsAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/new-job" element={<NewJob />} />
          <Route path="/new-budget" element={<NewJob isBudget={true} />} />
          <Route path="/budgets" element={<JobsList />} />
          <Route path="/job-types" element={<JobTypes />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/incoming-orders" element={<IncomingOrders />} />
          <Route path="/incoming-requisitions" element={<IncomingRequisitions />} />
          <Route path="/lab/finance" element={<Finance />} />
          <Route path="/lab/receipts" element={<Receipts />} />
          <Route path="/lab/dentists" element={<Dentists />} />
          <Route path="/lab/price-tables" element={<PriceTables />} />
          <Route path="/lab/inventory" element={<Inventory />} />
          <Route path="/lab/kanban" element={<Kanban />} />
          <Route path="/lab/logistics" element={<RoutePlanner />} />
          <Route path="/promised" element={<PromisedJobs />} />
          <Route path="/calendar" element={<ProductionCalendar />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/lab/monitoring" element={<MonitoringPage />} />
          <Route path="/tutorials" element={<TutorialsView />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/clinic/finance" element={<ClinicFinance />} />
          <Route path="/clinic/rooms" element={<RoomsManagement />} />
          <Route path="/clinic/dentists" element={<DentistsManagement />} />
          <Route path="/clinic/services" element={<ClinicServices />} />
          <Route path="/clinic/inventory" element={<ClinicInventory />} />
          <Route path="/clinic/team" element={<ClinicTeam />} />
          <Route path="/clinic/users" element={<ClinicTeam />} />
          <Route path="/clinic/settings" element={<ClinicSettings />} />
          <Route path="/dentist/cases" element={<DentistCases />} />
          <Route path="/dentist/requisitions" element={<DentistRequisitions />} />
          <Route path="/dentist/partnerships" element={<Partnerships />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/store" element={<UnifiedStore />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
          <Route path="/supplier/products" element={<SupplierProducts />} />
          <Route path="/supplier/coupons" element={<SupplierCoupons />} />
          <Route path="/supplier/settings" element={<SupplierSettings />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/nfc" element={<NfcKitsAdmin />} />
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { JobsList } from './pages/JobsList';
import { JobDetails } from './pages/JobDetails';
import { NewJob } from './pages/NewJob';
import { PromisedJobs } from './pages/PromisedJobs';
import { Kanban } from './pages/lab/Kanban';
import { ProductionCalendar } from './pages/ProductionCalendar';
import { JobTypes } from './pages/JobTypes';
import { IncomingOrders } from './pages/IncomingOrders';
import { IncomingRequisitions } from './pages/lab/IncomingRequisitions';
import { Dentists } from './pages/lab/Dentists';
import { PriceTables } from './pages/lab/PriceTables';
import { Inventory } from './pages/lab/Inventory';
import { Finance } from './pages/lab/Finance';
import { Receipts } from './pages/lab/Receipts';
import { Commissions } from './pages/Commissions';
import { RoutePlanner } from './pages/lab/RoutePlanner';
import Reports from './pages/Reports';
import { MonitoringPage } from './pages/MonitoringPage';
import { TutorialsView } from './pages/TutorialsView';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Subscribe } from './pages/Subscribe';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfUse } from './pages/TermsOfUse';
import { SupplierTermsAndGuidelines } from './pages/SupplierTermsAndGuidelines';
import { HelpdeskWorkspace } from './pages/HelpdeskWorkspace';
import { RequisitionInvite } from './pages/RequisitionInvite';
import { RegisterOrganization } from './pages/RegisterOrganization';
import { NFCReader } from './pages/NFCReader';
import { BioPage } from './pages/BioPage';
import { Admin } from './pages/Admin';

// Store
import { UnifiedStore } from './pages/store/UnifiedStore';
import { Cart } from './pages/store/Cart';

// Dentist / Client
import { DentistCases } from './pages/dentist/DentistCases';
import { Partnerships } from './pages/dentist/Partnerships';
import { DentistRequisitions } from './pages/dentist/DentistRequisitions';

// Clinic
import { Schedule } from './pages/clinic/Schedule';
import { ClinicFinance } from './pages/clinic/ClinicFinance';
import { RoomsManagement } from './pages/clinic/RoomsManagement';
import { DentistsManagement } from './pages/clinic/DentistsManagement';
import { Patients } from './pages/clinic/Patients';
import { ClinicServices } from './pages/clinic/ClinicServices';
import { ClinicInventory } from './pages/clinic/ClinicInventory';
import { ClinicTeam } from './pages/clinic/ClinicTeam';
import { ClinicSettings } from './pages/clinic/ClinicSettings';

// Supplier
import { SupplierDashboard } from './pages/supplier/Dashboard';
import { SupplierProducts } from './pages/supplier/Products';
import { SupplierCoupons } from './pages/supplier/Coupons';
import { SupplierChat } from './pages/supplier/Chat';
import { SupplierSettings } from './pages/supplier/Settings';

// SuperAdmin
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import { NfcKitsAdmin } from './pages/superadmin/NfcKitsAdmin';
import { Plans } from './pages/superadmin/Plans';
import { Coupons as SuperAdminCoupons } from './pages/superadmin/Coupons';
import Subscriptions from './pages/superadmin/Subscriptions';
import { MarketplaceCategoriesAdmin } from './pages/superadmin/MarketplaceCategoriesAdmin';
import SuperAdminFinance from './pages/superadmin/Finance';
import { WhatsAppTemplates } from './pages/superadmin/WhatsAppTemplates';
import { Tutorials as SuperAdminTutorials } from './pages/superadmin/Tutorials';
import { HelpdeskAgentsAdmin } from './pages/superadmin/HelpdeskAgentsAdmin';
import { LabResets } from './pages/superadmin/LabResets';
import { BioLinksAdmin } from './pages/superadmin/BioLinksAdmin';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Standalone routes outside main sidebar layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register-lab" element={<RegisterOrganization />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/supplier-terms" element={<SupplierTermsAndGuidelines />} />
          <Route path="/bio/:slug" element={<BioPage />} />
          <Route path="/requisition-invite" element={<RequisitionInvite />} />

          {/* Main App Routes wrapped in Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Jobs & Production */}
                  <Route path="/jobs" element={<JobsList />} />
                  <Route path="/jobs/:id" element={<JobDetails />} />
                  <Route path="/new-job" element={<NewJob />} />
                  <Route path="/budgets" element={<JobsList isBudgetMode={true} />} />
                  <Route path="/new-budget" element={<NewJob isBudget={true} />} />
                  <Route path="/promised" element={<PromisedJobs />} />
                  <Route path="/lab/kanban" element={<Kanban />} />
                  <Route path="/calendar" element={<ProductionCalendar />} />
                  <Route path="/job-types" element={<JobTypes />} />
                  <Route path="/incoming-orders" element={<IncomingOrders />} />
                  <Route path="/incoming-requisitions" element={<IncomingRequisitions />} />

                  {/* Lab Management */}
                  <Route path="/lab/dentists" element={<Dentists />} />
                  <Route path="/lab/price-tables" element={<PriceTables />} />
                  <Route path="/lab/inventory" element={<Inventory />} />
                  <Route path="/lab/finance" element={<Finance />} />
                  <Route path="/lab/receipts" element={<Receipts />} />
                  <Route path="/commissions" element={<Commissions />} />
                  <Route path="/lab/logistics" element={<RoutePlanner />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />
                  <Route path="/tutorials" element={<TutorialsView />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/subscribe" element={<Subscribe />} />
                  <Route path="/nfc" element={<NFCReader />} />
                  <Route path="/helpdesk" element={<HelpdeskWorkspace />} />

                  {/* Admin & Lab Settings */}
                  <Route path="/admin/*" element={<Admin />} />

                  {/* Store */}
                  <Route path="/store" element={<UnifiedStore />} />
                  <Route path="/store/:slug" element={<UnifiedStore />} />
                  <Route path="/cart" element={<Cart />} />

                  {/* Dentist / Client */}
                  <Route path="/dentist/cases" element={<DentistCases />} />
                  <Route path="/my-cases" element={<DentistCases />} />
                  <Route path="/dentist/partnerships" element={<Partnerships />} />
                  <Route path="/requisitions" element={<DentistRequisitions />} />
                  <Route path="/patients" element={<Patients />} />

                  {/* Clinic */}
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/clinic/finance" element={<ClinicFinance />} />
                  <Route path="/clinic/rooms" element={<RoomsManagement />} />
                  <Route path="/clinic/dentists" element={<DentistsManagement />} />
                  <Route path="/clinic/services" element={<ClinicServices />} />
                  <Route path="/clinic/inventory" element={<ClinicInventory />} />
                  <Route path="/clinic/team" element={<ClinicTeam />} />
                  <Route path="/clinic/users" element={<ClinicTeam />} />
                  <Route path="/clinic-settings" element={<ClinicSettings />} />

                  {/* Supplier */}
                  <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
                  <Route path="/supplier/products" element={<SupplierProducts />} />
                  <Route path="/supplier/coupons" element={<SupplierCoupons />} />
                  <Route path="/supplier/chat" element={<SupplierChat />} />
                  <Route path="/supplier/settings" element={<SupplierSettings />} />

                  {/* SuperAdmin */}
                  <Route path="/superadmin" element={<SuperAdminDashboard />} />
                  <Route path="/superadmin/nfc" element={<NfcKitsAdmin />} />
                  <Route path="/superadmin/plans" element={<Plans />} />
                  <Route path="/superadmin/coupons" element={<SuperAdminCoupons />} />
                  <Route path="/superadmin/subscriptions" element={<Subscriptions />} />
                  <Route path="/superadmin/categories" element={<MarketplaceCategoriesAdmin />} />
                  <Route path="/superadmin/finance" element={<SuperAdminFinance />} />
                  <Route path="/superadmin/whatsapp" element={<WhatsAppTemplates />} />
                  <Route path="/superadmin/tutorials" element={<SuperAdminTutorials />} />
                  <Route path="/superadmin/helpdesk" element={<HelpdeskAgentsAdmin />} />
                  <Route path="/superadmin/resets" element={<LabResets />} />
                  <Route path="/superadmin/bio" element={<BioLinksAdmin />} />

                  {/* Fallback redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

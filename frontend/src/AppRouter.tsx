import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterProducerPage } from './pages/RegisterProducerPage';
import { RegisterConsumerPage } from './pages/RegisterConsumerPage';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ProducerLayout } from './portals/producer/ProducerLayout';
import { DashboardPage } from './portals/producer/DashboardPage';
import { RequestsListPage } from './portals/producer/RequestsListPage';
import { NewRequestPage } from './portals/producer/NewRequestPage';
import { RequestDetailPage } from './portals/producer/RequestDetailPage';
import { ProfilePage } from './portals/producer/ProfilePage';
import { ProductsPage as ProducerProductsPage } from './portals/producer/ProductsPage';
import { AgentLayout } from './portals/agent/AgentLayout';
import { TasksHomePage } from './portals/agent/TasksHomePage';
import { NewCollectionPage } from './portals/agent/NewCollectionPage';
import { SampleDetailPage as AgentSampleDetailPage } from './portals/agent/SampleDetailPage';
import { AdminLayout } from './portals/admin/AdminLayout';
import { DashboardPage as AdminDashboardPage } from './portals/admin/pages/DashboardPage';
import { ProducersPage } from './portals/admin/pages/ProducersPage';
import { ProducerDetailPage } from './portals/admin/pages/ProducerDetailPage';
import { RequestsPage as AdminRequestsPage } from './portals/admin/pages/RequestsPage';
import { RequestDetailPage as AdminRequestDetailPage } from './portals/admin/pages/RequestDetailPage';
import { SamplesPage } from './portals/admin/pages/SamplesPage';
import { SampleDetailPage as AdminSampleDetailPage } from './portals/admin/pages/SampleDetailPage';
import { SealsPage } from './portals/admin/pages/SealsPage';
import { LaboratoryPage } from './portals/admin/pages/LaboratoryPage';
import { VerificationPage } from './portals/admin/pages/VerificationPage';
import { BatchesPage } from './portals/admin/pages/BatchesPage';
import { PackagingPage } from './portals/admin/pages/PackagingPage';
import { ProductsPage as AdminProductsPage } from './portals/admin/pages/ProductsPage';
import { ProductDetailPage } from './portals/admin/pages/ProductDetailPage';
import { CategoriesPage } from './portals/admin/pages/CategoriesPage';
import { QrCodesPage } from './portals/admin/pages/QrCodesPage';
import { ReportsPage } from './portals/admin/pages/ReportsPage';
import { TeamPage } from './portals/admin/pages/TeamPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription/producteur" element={<RegisterProducerPage />} />
      <Route path="/inscription/client" element={<RegisterConsumerPage />} />
      {/* Page canonique encodée dans l'image du QR — voir backend QrCodesService.generateImage */}
      <Route path="/verify/:identifier" element={<PublicVerifyPage />} />

      <Route
        path="/producteur"
        element={
          <ProtectedRoute allowedRoles={['PRODUCER']}>
            <ProducerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="demandes" element={<RequestsListPage />} />
        <Route path="demandes/nouvelle" element={<NewRequestPage />} />
        <Route path="demandes/:id" element={<RequestDetailPage />} />
        <Route path="produits" element={<ProducerProductsPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>

      <Route
        path="/agent"
        element={
          <ProtectedRoute allowedRoles={['FIELD_AGENT']}>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TasksHomePage />} />
        <Route path="collectes/nouvelle" element={<NewCollectionPage />} />
        <Route path="echantillons/:id" element={<AgentSampleDetailPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'VERIFICATION_TEAM']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="producteurs" element={<ProducersPage />} />
        <Route path="producteurs/:id" element={<ProducerDetailPage />} />
        <Route path="demandes" element={<AdminRequestsPage />} />
        <Route path="demandes/:id" element={<AdminRequestDetailPage />} />
        <Route path="echantillons" element={<SamplesPage />} />
        <Route path="echantillons/:id" element={<AdminSampleDetailPage />} />
        <Route path="scelles" element={<SealsPage />} />
        <Route path="laboratoire" element={<LaboratoryPage />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="lots" element={<BatchesPage />} />
        <Route path="emballage" element={<PackagingPage />} />
        <Route path="produits" element={<AdminProductsPage />} />
        <Route path="produits/:id" element={<ProductDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="qr-codes" element={<QrCodesPage />} />
        <Route path="rapports" element={<ReportsPage />} />
        <Route
          path="equipe"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TeamPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Marketplace / vitrine publique (inchangé pour l'instant — étape 9) */}
      <Route path="/*" element={<App />} />
    </Routes>
  );
};

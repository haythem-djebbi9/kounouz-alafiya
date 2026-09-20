import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterProducerPage } from './pages/RegisterProducerPage';
import { RegisterConsumerPage } from './pages/RegisterConsumerPage';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { GuidePage } from './pages/GuidePage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ProducerLayout } from './portals/producer/ProducerLayout';
import { DashboardPage } from './portals/producer/DashboardPage';
import { RequestsListPage } from './portals/producer/RequestsListPage';
import { NewRequestPage } from './portals/producer/NewRequestPage';
import { RequestDetailPage } from './portals/producer/RequestDetailPage';
import { ProfilePage } from './portals/producer/ProfilePage';
import { ProductsPage as ProducerProductsPage } from './portals/producer/ProductsPage';
import { SettingsPage as ProducerSettingsPage } from './portals/producer/SettingsPage';
import { HelpPage as ProducerHelpPage } from './portals/producer/HelpPage';
import { SamplesPage as ProducerSamplesPage } from './portals/producer/SamplesPage';
import { BatchesPage as ProducerBatchesPage } from './portals/producer/BatchesPage';
import { NotificationsPage as ProducerNotificationsPage } from './portals/producer/NotificationsPage';
import { SalesDashboardPage } from './portals/producer/sales/SalesDashboardPage';
import { SalesHistoryPage } from './portals/producer/sales/SalesHistoryPage';
import { EarningsPage } from './portals/producer/sales/EarningsPage';
import { SettlementDetailsPage } from './portals/producer/sales/SettlementDetailsPage';
import { AgentLayout } from './portals/agent/AgentLayout';
import { DashboardPage as AgentDashboardPage } from './portals/agent/pages/DashboardPage';
import { AssignmentsPage as AgentAssignmentsPage } from './portals/agent/pages/AssignmentsPage';
import { AssignmentDetailPage as AgentAssignmentDetailPage } from './portals/agent/pages/AssignmentDetailPage';
import { CollectionHomePage as AgentCollectionHomePage } from './portals/agent/pages/CollectionHomePage';
import { CollectionWizardPage as AgentCollectionWizardPage } from './portals/agent/pages/CollectionWizardPage';
import { SealsPage as AgentSealsPage } from './portals/agent/pages/SealsPage';
import { CustodyListPage as AgentCustodyListPage } from './portals/agent/pages/CustodyListPage';
import { CustodyDetailPage as AgentCustodyDetailPage } from './portals/agent/pages/CustodyDetailPage';
import { VisitsPage as AgentVisitsPage } from './portals/agent/pages/VisitsPage';
import { ReportsPage as AgentReportsPage } from './portals/agent/pages/ReportsPage';
import { NotificationsPage as AgentNotificationsPage } from './portals/agent/pages/NotificationsPage';
import { MessagesPage as AgentMessagesPage } from './portals/agent/pages/MessagesPage';
import { SettingsPage as AgentSettingsPage } from './portals/agent/SettingsPage';
import { HelpPage as AgentHelpPage } from './portals/agent/HelpPage';
import { AdminLayout } from './portals/admin/AdminLayout';
import { DashboardPage as AdminDashboardPage } from './portals/admin/console/pages/DashboardPage';
import { UsersRolesPage } from './portals/admin/console/pages/UsersRolesPage';
import { ProducersManagementPage } from './portals/admin/console/pages/ProducersManagementPage';
import { LaboratoriesManagementPage } from './portals/admin/console/pages/LaboratoriesManagementPage';
import { AuditLogPage } from './portals/admin/console/pages/AuditLogPage';
import { QrScanAnalyticsPage } from './portals/admin/console/pages/QrScanAnalyticsPage';
import { AntiCounterfeitAlertsPage } from './portals/admin/console/pages/AntiCounterfeitAlertsPage';
import { BusinessAnalyticsPage } from './portals/admin/console/pages/BusinessAnalyticsPage';
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
import { SettingsPage as AdminSettingsPage } from './portals/admin/pages/SettingsPage';
import { HelpPage as AdminHelpPage } from './portals/admin/pages/HelpPage';
import { SupportInboxPage } from './portals/admin/pages/SupportInboxPage';
import { OrdersPage as AdminOrdersPage } from './portals/admin/pages/OrdersPage';
import { SettlementsPage as AdminSettlementsPage } from './portals/admin/pages/SettlementsPage';
import { VerifierLayout } from './portals/verifier/VerifierLayout';
import { DashboardPage as VerifierDashboardPage } from './portals/verifier/pages/DashboardPage';
import { VerificationCenterPage } from './portals/verifier/pages/VerificationCenterPage';
import { RequestReviewPage } from './portals/verifier/pages/RequestReviewPage';
import { SampleManagementPage } from './portals/verifier/pages/SampleManagementPage';
import { LaboratoryPage as VerifierLaboratoryPage } from './portals/verifier/pages/LaboratoryPage';
import { ReferenceSamplesPage } from './portals/verifier/pages/ReferenceSamplesPage';
import { VerificationDecisionPage } from './portals/verifier/pages/VerificationDecisionPage';
import { VerifiedBatchesPage } from './portals/verifier/pages/VerifiedBatchesPage';
import { BatchDetailPage } from './portals/verifier/pages/BatchDetailPage';
import { PackagingPage as VerifierPackagingPage } from './portals/verifier/pages/PackagingPage';
import { ProductCreationPage } from './portals/verifier/pages/ProductCreationPage';
import { QrGenerationPage } from './portals/verifier/pages/QrGenerationPage';
import { QrManagementPage } from './portals/verifier/pages/QrManagementPage';

const LegacySampleRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/agent/tracabilite/${id}`} replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription/producteur" element={<RegisterProducerPage />} />
      <Route path="/inscription/client" element={<RegisterConsumerPage />} />
      <Route path="/guide" element={<GuidePage />} />
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
        <Route path="demandes/:id/modifier" element={<NewRequestPage />} />
        <Route path="echantillons" element={<ProducerSamplesPage />} />
        <Route path="lots" element={<ProducerBatchesPage />} />
        <Route path="produits" element={<ProducerProductsPage />} />
        <Route path="ventes" element={<SalesDashboardPage />} />
        <Route path="ventes/historique" element={<SalesHistoryPage />} />
        <Route path="ventes/gains" element={<EarningsPage />} />
        <Route path="ventes/reglements" element={<SettlementDetailsPage />} />
        <Route path="notifications" element={<ProducerNotificationsPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="parametres" element={<ProducerSettingsPage />} />
        <Route path="aide" element={<ProducerHelpPage />} />
      </Route>

      <Route
        path="/agent"
        element={
          <ProtectedRoute allowedRoles={['FIELD_AGENT']}>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentDashboardPage />} />
        <Route path="missions" element={<AgentAssignmentsPage />} />
        <Route path="missions/:id" element={<AgentAssignmentDetailPage />} />
        <Route path="collecte" element={<AgentCollectionHomePage />} />
        <Route path="collecte/:assignmentId" element={<AgentCollectionWizardPage />} />
        <Route path="scelles" element={<AgentSealsPage />} />
        <Route path="tracabilite" element={<AgentCustodyListPage />} />
        <Route path="tracabilite/:id" element={<AgentCustodyDetailPage />} />
        <Route path="visites" element={<AgentVisitsPage />} />
        <Route path="rapports" element={<AgentReportsPage />} />
        <Route path="notifications" element={<AgentNotificationsPage />} />
        <Route path="messages" element={<AgentMessagesPage />} />
        {/* Anciennes adresses du portail, encore présentes dans des notifications. */}
        <Route path="echantillons/:id" element={<LegacySampleRedirect />} />
        <Route path="collectes/nouvelle" element={<Navigate to="/agent/missions?tab=AVAILABLE" replace />} />
        <Route path="parametres" element={<AgentSettingsPage />} />
        <Route path="aide" element={<AgentHelpPage />} />
      </Route>

      {/* Portail Équipe de Vérification — moteur de confiance Kounouz. */}
      <Route
        path="/verificateur"
        element={
          <ProtectedRoute allowedRoles={['VERIFICATION_TEAM', 'ADMIN']}>
            <VerifierLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VerifierDashboardPage />} />
        <Route path="centre" element={<VerificationCenterPage />} />
        <Route path="demandes" element={<RequestReviewPage />} />
        <Route path="echantillons" element={<SampleManagementPage />} />
        <Route path="laboratoire" element={<VerifierLaboratoryPage />} />
        <Route path="etalons" element={<ReferenceSamplesPage />} />
        <Route path="decisions" element={<VerificationDecisionPage />} />
        <Route path="lots" element={<VerifiedBatchesPage />} />
        <Route path="lots/:id" element={<BatchDetailPage />} />
        <Route path="emballage" element={<VerifierPackagingPage />} />
        <Route path="produits" element={<ProductCreationPage />} />
        <Route path="qr" element={<QrGenerationPage />} />
        <Route path="qr/gestion" element={<QrManagementPage />} />
        <Route path="rapports" element={<ReportsPage />} />
        <Route path="parametres" element={<AdminSettingsPage />} />
        <Route path="aide" element={<AdminHelpPage />} />
        <Route
          path="equipe"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <TeamPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          // L'équipe de vérification travaille dans /verificateur ; /admin reste
          // le back-office de l'ADMIN (catalogue, ventes, règlements).
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="utilisateurs" element={<UsersRolesPage />} />
        <Route path="producteurs" element={<ProducersManagementPage />} />
        <Route path="laboratoires" element={<LaboratoriesManagementPage />} />
        <Route path="analyses/scans" element={<QrScanAnalyticsPage />} />
        <Route path="analyses/alertes" element={<AntiCounterfeitAlertsPage />} />
        <Route path="analyses/verification" element={<BusinessAnalyticsPage />} />
        <Route path="journal" element={<AuditLogPage />} />
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
        <Route path="commandes" element={<AdminOrdersPage />} />
        <Route path="reglements" element={<AdminSettlementsPage />} />
        <Route path="rapports" element={<ReportsPage />} />
        <Route path="support" element={<SupportInboxPage />} />
        <Route path="parametres" element={<AdminSettingsPage />} />
        <Route path="aide" element={<AdminHelpPage />} />
        {/* Ancienne adresse de la gestion d'équipe, remplacée par Utilisateurs & rôles. */}
        <Route path="equipe" element={<Navigate to="/admin/utilisateurs" replace />} />
      </Route>

      {/* Marketplace / vitrine publique (inchangé pour l'instant — étape 9) */}
      <Route path="/*" element={<App />} />
    </Routes>
  );
};

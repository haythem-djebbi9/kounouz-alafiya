import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Chaque portail (producteur, agent, vérification, administration) et les
// pages de connexion sont chargés à la demande : un visiteur de la vitrine ne
// télécharge que la vitrine. La page de vérification publique (/verify, ouverte
// par un scan de QR) reste dans le paquet principal pour s'afficher d'emblée.
const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] grid place-items-center" role="status" aria-live="polite">
    <span className="w-9 h-9 rounded-full border-4 border-[#EAE1D2] border-t-[#D49B37] animate-spin" />
  </div>
);

function lazyPage<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string): React.FC {
  const Inner = lazy(async () => ({ default: (await load())[name] as React.ComponentType }));
  const Page: React.FC = () => (
    <Suspense fallback={<PageLoader />}>
      <Inner />
    </Suspense>
  );
  Page.displayName = name;
  return Page;
}

const LoginPage = lazyPage(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterProducerPage = lazyPage(() => import('./pages/RegisterProducerPage'), 'RegisterProducerPage');
const RegisterConsumerPage = lazyPage(() => import('./pages/RegisterConsumerPage'), 'RegisterConsumerPage');
const GuidePage = lazyPage(() => import('./pages/GuidePage'), 'GuidePage');
const ProducerLayout = lazyPage(() => import('./portals/producer/ProducerLayout'), 'ProducerLayout');
const DashboardPage = lazyPage(() => import('./portals/producer/DashboardPage'), 'DashboardPage');
const RequestsListPage = lazyPage(() => import('./portals/producer/RequestsListPage'), 'RequestsListPage');
const NewRequestPage = lazyPage(() => import('./portals/producer/NewRequestPage'), 'NewRequestPage');
const RequestDetailPage = lazyPage(() => import('./portals/producer/RequestDetailPage'), 'RequestDetailPage');
const ProfilePage = lazyPage(() => import('./portals/producer/ProfilePage'), 'ProfilePage');
const ProducerProductsPage = lazyPage(() => import('./portals/producer/ProductsPage'), 'ProductsPage');
const ProducerSettingsPage = lazyPage(() => import('./portals/producer/SettingsPage'), 'SettingsPage');
const ProducerHelpPage = lazyPage(() => import('./portals/producer/HelpPage'), 'HelpPage');
const ProducerSamplesPage = lazyPage(() => import('./portals/producer/SamplesPage'), 'SamplesPage');
const ProducerBatchesPage = lazyPage(() => import('./portals/producer/BatchesPage'), 'BatchesPage');
const ProducerNotificationsPage = lazyPage(() => import('./portals/producer/NotificationsPage'), 'NotificationsPage');
const SalesDashboardPage = lazyPage(() => import('./portals/producer/sales/SalesDashboardPage'), 'SalesDashboardPage');
const SalesHistoryPage = lazyPage(() => import('./portals/producer/sales/SalesHistoryPage'), 'SalesHistoryPage');
const EarningsPage = lazyPage(() => import('./portals/producer/sales/EarningsPage'), 'EarningsPage');
const SettlementDetailsPage = lazyPage(() => import('./portals/producer/sales/SettlementDetailsPage'), 'SettlementDetailsPage');
const AgentLayout = lazyPage(() => import('./portals/agent/AgentLayout'), 'AgentLayout');
const AgentDashboardPage = lazyPage(() => import('./portals/agent/pages/DashboardPage'), 'DashboardPage');
const AgentAssignmentsPage = lazyPage(() => import('./portals/agent/pages/AssignmentsPage'), 'AssignmentsPage');
const AgentAssignmentDetailPage = lazyPage(() => import('./portals/agent/pages/AssignmentDetailPage'), 'AssignmentDetailPage');
const AgentCollectionHomePage = lazyPage(() => import('./portals/agent/pages/CollectionHomePage'), 'CollectionHomePage');
const AgentCollectionWizardPage = lazyPage(() => import('./portals/agent/pages/CollectionWizardPage'), 'CollectionWizardPage');
const AgentSealsPage = lazyPage(() => import('./portals/agent/pages/SealsPage'), 'SealsPage');
const AgentCustodyListPage = lazyPage(() => import('./portals/agent/pages/CustodyListPage'), 'CustodyListPage');
const AgentCustodyDetailPage = lazyPage(() => import('./portals/agent/pages/CustodyDetailPage'), 'CustodyDetailPage');
const AgentVisitsPage = lazyPage(() => import('./portals/agent/pages/VisitsPage'), 'VisitsPage');
const AgentReportsPage = lazyPage(() => import('./portals/agent/pages/ReportsPage'), 'ReportsPage');
const AgentNotificationsPage = lazyPage(() => import('./portals/agent/pages/NotificationsPage'), 'NotificationsPage');
const AgentMessagesPage = lazyPage(() => import('./portals/agent/pages/MessagesPage'), 'MessagesPage');
const AgentSettingsPage = lazyPage(() => import('./portals/agent/SettingsPage'), 'SettingsPage');
const AgentHelpPage = lazyPage(() => import('./portals/agent/HelpPage'), 'HelpPage');
const AdminLayout = lazyPage(() => import('./portals/admin/AdminLayout'), 'AdminLayout');
const AdminDashboardPage = lazyPage(() => import('./portals/admin/console/pages/DashboardPage'), 'DashboardPage');
const UsersRolesPage = lazyPage(() => import('./portals/admin/console/pages/UsersRolesPage'), 'UsersRolesPage');
const ProducersManagementPage = lazyPage(() => import('./portals/admin/console/pages/ProducersManagementPage'), 'ProducersManagementPage');
const LaboratoriesManagementPage = lazyPage(() => import('./portals/admin/console/pages/LaboratoriesManagementPage'), 'LaboratoriesManagementPage');
const AuditLogPage = lazyPage(() => import('./portals/admin/console/pages/AuditLogPage'), 'AuditLogPage');
const QrScanAnalyticsPage = lazyPage(() => import('./portals/admin/console/pages/QrScanAnalyticsPage'), 'QrScanAnalyticsPage');
const AntiCounterfeitAlertsPage = lazyPage(() => import('./portals/admin/console/pages/AntiCounterfeitAlertsPage'), 'AntiCounterfeitAlertsPage');
const BusinessAnalyticsPage = lazyPage(() => import('./portals/admin/console/pages/BusinessAnalyticsPage'), 'BusinessAnalyticsPage');
const ProducerDetailPage = lazyPage(() => import('./portals/admin/pages/ProducerDetailPage'), 'ProducerDetailPage');
const AdminRequestsPage = lazyPage(() => import('./portals/admin/pages/RequestsPage'), 'RequestsPage');
const AdminRequestDetailPage = lazyPage(() => import('./portals/admin/pages/RequestDetailPage'), 'RequestDetailPage');
const SamplesPage = lazyPage(() => import('./portals/admin/pages/SamplesPage'), 'SamplesPage');
const AdminSampleDetailPage = lazyPage(() => import('./portals/admin/pages/SampleDetailPage'), 'SampleDetailPage');
const SealsPage = lazyPage(() => import('./portals/admin/pages/SealsPage'), 'SealsPage');
const LaboratoryPage = lazyPage(() => import('./portals/admin/pages/LaboratoryPage'), 'LaboratoryPage');
const VerificationPage = lazyPage(() => import('./portals/admin/pages/VerificationPage'), 'VerificationPage');
const BatchesPage = lazyPage(() => import('./portals/admin/pages/BatchesPage'), 'BatchesPage');
const PackagingPage = lazyPage(() => import('./portals/admin/pages/PackagingPage'), 'PackagingPage');
const AdminProductsPage = lazyPage(() => import('./portals/admin/pages/ProductsPage'), 'ProductsPage');
const ProductDetailPage = lazyPage(() => import('./portals/admin/pages/ProductDetailPage'), 'ProductDetailPage');
const CategoriesPage = lazyPage(() => import('./portals/admin/pages/CategoriesPage'), 'CategoriesPage');
const QrCodesPage = lazyPage(() => import('./portals/admin/pages/QrCodesPage'), 'QrCodesPage');
const ReportsPage = lazyPage(() => import('./portals/admin/pages/ReportsPage'), 'ReportsPage');
const TeamPage = lazyPage(() => import('./portals/admin/pages/TeamPage'), 'TeamPage');
const AdminSettingsPage = lazyPage(() => import('./portals/admin/pages/SettingsPage'), 'SettingsPage');
const AdminHelpPage = lazyPage(() => import('./portals/admin/pages/HelpPage'), 'HelpPage');
const SupportInboxPage = lazyPage(() => import('./portals/admin/pages/SupportInboxPage'), 'SupportInboxPage');
const AdminOrdersPage = lazyPage(() => import('./portals/admin/pages/OrdersPage'), 'OrdersPage');
const AdminSettlementsPage = lazyPage(() => import('./portals/admin/pages/SettlementsPage'), 'SettlementsPage');
const VerifierLayout = lazyPage(() => import('./portals/verifier/VerifierLayout'), 'VerifierLayout');
const VerifierDashboardPage = lazyPage(() => import('./portals/verifier/pages/DashboardPage'), 'DashboardPage');
const VerificationCenterPage = lazyPage(() => import('./portals/verifier/pages/VerificationCenterPage'), 'VerificationCenterPage');
const RequestReviewPage = lazyPage(() => import('./portals/verifier/pages/RequestReviewPage'), 'RequestReviewPage');
const SampleManagementPage = lazyPage(() => import('./portals/verifier/pages/SampleManagementPage'), 'SampleManagementPage');
const VerifierLaboratoryPage = lazyPage(() => import('./portals/verifier/pages/LaboratoryPage'), 'LaboratoryPage');
const ReferenceSamplesPage = lazyPage(() => import('./portals/verifier/pages/ReferenceSamplesPage'), 'ReferenceSamplesPage');
const VerificationDecisionPage = lazyPage(() => import('./portals/verifier/pages/VerificationDecisionPage'), 'VerificationDecisionPage');
const VerifiedBatchesPage = lazyPage(() => import('./portals/verifier/pages/VerifiedBatchesPage'), 'VerifiedBatchesPage');
const BatchDetailPage = lazyPage(() => import('./portals/verifier/pages/BatchDetailPage'), 'BatchDetailPage');
const VerifierPackagingPage = lazyPage(() => import('./portals/verifier/pages/PackagingPage'), 'PackagingPage');
const ProductCreationPage = lazyPage(() => import('./portals/verifier/pages/ProductCreationPage'), 'ProductCreationPage');
const QrGenerationPage = lazyPage(() => import('./portals/verifier/pages/QrGenerationPage'), 'QrGenerationPage');
const QrManagementPage = lazyPage(() => import('./portals/verifier/pages/QrManagementPage'), 'QrManagementPage');

const CommissionPage = lazyPage(() => import('./portals/admin/pages/CommissionPage'), 'CommissionPage');
const BlogListPage = lazyPage(() => import('./portals/admin/pages/BlogListPage'), 'BlogListPage');
const BlogEditorPage = lazyPage(() => import('./portals/admin/pages/BlogEditorPage'), 'BlogEditorPage');

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
        <Route path="commission" element={<CommissionPage />} />
        <Route path="blog" element={<BlogListPage />} />
        <Route path="blog/nouveau" element={<BlogEditorPage />} />
        <Route path="blog/:id" element={<BlogEditorPage />} />
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

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { LoginPage } from './pages/LoginPage';
import { RegisterProducerPage } from './pages/RegisterProducerPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ProducerLayout } from './portals/producer/ProducerLayout';
import { DashboardPage } from './portals/producer/DashboardPage';
import { RequestsListPage } from './portals/producer/RequestsListPage';
import { NewRequestPage } from './portals/producer/NewRequestPage';
import { RequestDetailPage } from './portals/producer/RequestDetailPage';
import { ProfilePage } from './portals/producer/ProfilePage';
import { ProductsPage } from './portals/producer/ProductsPage';
import { AgentLayout } from './portals/agent/AgentLayout';
import { TasksHomePage } from './portals/agent/TasksHomePage';
import { NewCollectionPage } from './portals/agent/NewCollectionPage';
import { SampleDetailPage } from './portals/agent/SampleDetailPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription/producteur" element={<RegisterProducerPage />} />

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
        <Route path="produits" element={<ProductsPage />} />
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
        <Route path="echantillons/:id" element={<SampleDetailPage />} />
      </Route>

      {/* Marketplace / vitrine publique (inchangé pour l'instant — étape 9) */}
      <Route path="/*" element={<App />} />
    </Routes>
  );
};

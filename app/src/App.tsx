import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import RequireAuth from '@/components/RequireAuth';
import Login from '@/screens/Login';
import Solicitations from '@/screens/Dashboard';      // dashboard repurposed as the tracked-solicitations index
import Opportunities from '@/screens/Feed';            // recommendation feed for solicitations
import Leads from '@/screens/Leads';
import Clients from '@/screens/Clients';
import NewSolicitation from '@/screens/NewSolicitation';
import EditSolicitation from '@/screens/EditSolicitation';
import SolicitationPage from '@/screens/SolicitationPage';
import CitationsTable from '@/screens/CitationsTable';
import QuestionsForm from '@/screens/QuestionsForm';
import Settings from '@/screens/Settings';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        {/* Pipeline */}
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/leads" element={<Leads />} />

        {/* Workspace */}
        <Route path="/solicitations" element={<Solicitations />} />
        <Route path="/clients" element={<Clients />} />

        {/* Solicitation detail flow */}
        <Route path="/solicitations/new" element={<NewSolicitation />} />
        <Route path="/solicitations/:id" element={<SolicitationPage />} />
        <Route path="/solicitations/:id/edit" element={<EditSolicitation />} />
        <Route path="/qmat/:qmatId/citations" element={<CitationsTable />} />
        <Route path="/qmat/:qmatId/questions" element={<QuestionsForm />} />

        <Route path="/settings" element={<Settings />} />

        {/* Backward-compat redirects from the previous IA */}
        <Route path="/dashboard" element={<Navigate to="/solicitations" replace />} />
        <Route path="/feed" element={<Navigate to="/opportunities" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/solicitations" replace />} />
      <Route path="*" element={<Navigate to="/solicitations" replace />} />
    </Routes>
  );
};

export default App;

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import RequireAuth from '@/components/RequireAuth';
import Login from '@/screens/Login';
import Solicitations from '@/screens/Dashboard';      // dashboard repurposed as the tracked-solicitations index
import NewSolicitation from '@/screens/NewSolicitation';
import EditSolicitation from '@/screens/EditSolicitation';
import SolicitationPage from '@/screens/SolicitationPage';
import CitationsTable from '@/screens/CitationsTable';
import ExtractionRuns from '@/screens/ExtractionRuns';
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
        {/* Workspace */}
        <Route path="/solicitations" element={<Solicitations />} />

        {/* Solicitation detail flow */}
        <Route path="/solicitations/new" element={<NewSolicitation />} />
        <Route path="/solicitations/:id" element={<SolicitationPage />} />
        <Route path="/solicitations/:id/edit" element={<EditSolicitation />} />
        <Route path="/extraction/:runId/citations" element={<CitationsTable />} />
        <Route path="/extraction-runs" element={<ExtractionRuns />} />

        <Route path="/settings" element={<Settings />} />

        {/* Backward-compat redirect from the previous IA */}
        <Route path="/dashboard" element={<Navigate to="/solicitations" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/solicitations" replace />} />
      <Route path="*" element={<Navigate to="/solicitations" replace />} />
    </Routes>
  );
};

export default App;

import React, { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import SolicitationForm from './SolicitationForm';
import { useSolicitations } from '@/store/solicitations';

const EditSolicitation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const solicitations = useSolicitations((s) => s.solicitations);
  const sol = useMemo(
    () => (id ? solicitations.find((s) => s.id === id) : undefined),
    [solicitations, id],
  );
  if (!sol) return <Navigate to="/solicitations" replace />;
  return <SolicitationForm existing={sol} />;
};

export default EditSolicitation;

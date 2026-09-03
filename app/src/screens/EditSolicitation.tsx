import React, { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Modal from '@/components/Modal';
import SolicitationForm from './SolicitationForm';
import SolicitationPage from './SolicitationPage';
import { useSolicitations } from '@/store/solicitations';

/** Edit Solicitation is a centered overlay card over the solicitation's own
 * detail page — same visual language as NewSolicitationModal, but layered
 * on top of SolicitationPage (same :id, read from the same route params)
 * instead of a blank background. Closing/canceling just drops the modal,
 * landing back on that same page. */
const EditSolicitation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const solicitations = useSolicitations((s) => s.solicitations);
  const sol = useMemo(
    () => (id ? solicitations.find((s) => s.id === id) : undefined),
    [solicitations, id],
  );
  if (!sol) return <Navigate to="/solicitations" replace />;

  const close = () => navigate(`/solicitations/${sol.id}`);

  return (
    <>
      <SolicitationPage />
      <Modal
        open
        onClose={close}
        title="Edit Solicitation"
        subtitle={sol.number}
        maxWidth={620}
        footer={
          <>
            <button type="button" className="btn ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" form="edit-solicitation-form" className="btn">
              Save Changes
            </button>
          </>
        }
      >
        <SolicitationForm existing={sol} />
      </Modal>
    </>
  );
};

export default EditSolicitation;

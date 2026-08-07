import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSolicitations } from '@/store/solicitations';
import { SAMPLE_QUESTIONS, SAMPLE_REQUIREMENTS } from '@/fixtures/qmat-sample';
import ExportModal from '@/components/ExportModal';
import type { Requirement, RequirementType } from '@/types';

const TYPE_LABELS: Record<RequirementType, string> = {
  shall: 'Shall', will: 'Will', should: 'Should', may: 'May', must: 'Must',
};

type AnsweredFilter = 'Any' | 'Answered' | 'Unanswered';

const QuestionsForm: React.FC = () => {
  const { qmatId } = useParams<{ qmatId: string }>();
  const navigate = useNavigate();

  const documents = useSolicitations((s) => s.documents);
  const allAnswers = useSolicitations((s) => s.answers);
  const allFollowups = useSolicitations((s) => s.followups);
  const setAnswer = useSolicitations((s) => s.setAnswer);
  const setFollowup = useSolicitations((s) => s.setFollowup);

  const qmatDoc = useMemo(
    () => documents.find((d) => d.id === qmatId),
    [documents, qmatId],
  );
  const answers = useMemo(
    () => (qmatId ? allAnswers[qmatId] ?? {} : {}),
    [allAnswers, qmatId],
  );
  const followups = useMemo(
    () => (qmatId ? allFollowups[qmatId] ?? {} : {}),
    [allFollowups, qmatId],
  );

  const reqIndex = useMemo(() => {
    const m = new Map<string, Requirement>();
    SAMPLE_REQUIREMENTS.forEach((r) => m.set(r.id, r));
    return m;
  }, []);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequirementType | 'All'>('All');
  const [answeredFilter, setAnsweredFilter] = useState<AnsweredFilter>('Any');
  const [showExport, setShowExport] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_QUESTIONS.filter((qn) => {
      const req = reqIndex.get(qn.requirementId);
      if (typeFilter !== 'All' && req?.type !== typeFilter) return false;

      const isAnswered = !!answers[qn.id];
      if (answeredFilter === 'Answered' && !isAnswered) return false;
      if (answeredFilter === 'Unanswered' && isAnswered) return false;

      if (!q) return true;
      return (
        qn.prompt.toLowerCase().includes(q) ||
        qn.id.toLowerCase().includes(q) ||
        (req?.text.toLowerCase().includes(q) ?? false) ||
        (req?.section.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, typeFilter, answeredFilter, answers, reqIndex]);

  const answeredCount = useMemo(
    () => SAMPLE_QUESTIONS.filter((qn) => !!answers[qn.id]).length,
    [answers],
  );

  if (!qmatDoc) return <Navigate to="/dashboard" replace />;

  return (
    <>
      <button
        type="button"
        className="back-link"
        onClick={() => navigate(`/solicitations/${qmatDoc.solicitationId}`)}
      >
        ← Back to Solicitation
      </button>

      <header className="page-header" style={{ marginTop: 8 }}>
        <div>
          <div className="qmat-title">{qmatDoc.name}</div>
          <div className="qmat-sub">
            Capture prospect answers · {SAMPLE_QUESTIONS.length} questions ·{' '}
            {answeredCount} of {SAMPLE_QUESTIONS.length} answered
          </div>
        </div>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setShowExport(true)}
          >
            Export ▼
          </button>
        </div>
      </header>

      <div className="row tight" style={{ marginBottom: 14 }}>
        <input
          type="search"
          placeholder="🔍 Search questions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as RequirementType | 'All')}
        >
          <option value="All">Type: All</option>
          {(['shall','will','should','may','must'] as RequirementType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={answeredFilter}
          onChange={(e) => setAnsweredFilter(e.target.value as AnsweredFilter)}
        >
          <option value="Any">Answered: Any</option>
          <option value="Answered">Answered</option>
          <option value="Unanswered">Unanswered</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No questions match those filters.</div>
      ) : (
        filtered.map((qn) => {
          const req = reqIndex.get(qn.requirementId);
          const selected = answers[qn.id];
          const followup = followups[qn.id] ?? '';
          return (
            <article key={qn.id} className="q-card">
              <div className="q-card-head">
                <span className="q-id">
                  {qn.requirementId} · {req?.section}
                </span>
                {req && <span className={`pill ${req.type}`}>{TYPE_LABELS[req.type]}</span>}
              </div>
              {req && (
                <div className="q-req">
                  Requirement: &ldquo;{req.text}&rdquo;
                  {req.flag?.severity === 'critical' && (
                    <span style={{ color: 'var(--crit)', fontWeight: 600, marginLeft: 6 }}>
                      ⚑ Critical flag — {req.flag.note}
                    </span>
                  )}
                </div>
              )}
              <div className="q-question">{qn.prompt}</div>
              <div className="q-options" role="radiogroup">
                {qn.options.map((opt) => {
                  const isSel = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`q-option ${isSel ? 'selected' : ''}`}
                      role="radio"
                      aria-checked={isSel}
                      onClick={() => qmatId && setAnswer(qmatId, qn.id, opt.id)}
                    >
                      <span className="dot">{isSel ? '●' : '○'}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {qn.detailHint && (
                <textarea
                  className="q-detail"
                  placeholder={qn.detailHint}
                  value={followup}
                  onChange={(e) =>
                    qmatId && setFollowup(qmatId, qn.id, e.target.value)
                  }
                  rows={2}
                />
              )}
            </article>
          );
        })
      )}

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <button
          type="button"
          className="btn ghost"
          onClick={() => navigate(`/qmat/${qmatId}/citations`)}
        >
          ← Back to Citations
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate(`/solicitations/${qmatDoc.solicitationId}`)}
        >
          Finish
        </button>
      </div>

      {showExport && qmatId && (
        <ExportModal qmatId={qmatId} onClose={() => setShowExport(false)} />
      )}
    </>
  );
};

export default QuestionsForm;

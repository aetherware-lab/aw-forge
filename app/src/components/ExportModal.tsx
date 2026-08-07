import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { useSolicitations } from '@/store/solicitations';
import { SAMPLE_QUESTIONS, SAMPLE_REQUIREMENTS } from '@/fixtures/qmat-sample';

type Format = 'xlsx' | 'csv' | 'docx';

interface IncludeFlags {
  answers: boolean;
  citations: boolean;
  confidence: boolean;
  colors: boolean;
}

interface Props {
  qmatId: string;
  onClose: () => void;
}

/**
 * Overlay C — Export Qualification Matrix.
 * Today: builds the payload and console.logs it. Real file write goes in
 * the main process when the export pipeline lands.
 */
const ExportModal: React.FC<Props> = ({ qmatId, onClose }) => {
  const documents = useSolicitations((s) => s.documents);
  const allAnswers = useSolicitations((s) => s.answers);
  const allFollowups = useSolicitations((s) => s.followups);

  const qmatDoc = useMemo(
    () => documents.find((d) => d.id === qmatId),
    [documents, qmatId],
  );
  const solicitations = useSolicitations((s) => s.solicitations);
  const sol = useMemo(
    () => solicitations.find((s) => s.id === qmatDoc?.solicitationId),
    [solicitations, qmatDoc],
  );

  const [format, setFormat] = useState<Format>('xlsx');
  const [include, setInclude] = useState<IncludeFlags>({
    answers: true,
    citations: true,
    confidence: true,
    colors: false,
  });

  const onDownload = () => {
    const payload = {
      qmatId,
      qmat: qmatDoc?.name,
      solicitation: sol ? { number: sol.number, title: sol.title } : null,
      format,
      include,
      requirements: SAMPLE_REQUIREMENTS.map((r) => ({
        id: r.id,
        section: r.section,
        text: r.text,
        type: r.type,
        confidence: include.confidence ? r.confidence : undefined,
        flag: include.confidence ? r.flag : undefined,
        citations: include.citations ? r.citations : undefined,
      })),
      answers: include.answers
        ? SAMPLE_QUESTIONS.map((qn) => ({
            requirementId: qn.requirementId,
            questionId: qn.id,
            prompt: qn.prompt,
            selected: allAnswers[qmatId]?.[qn.id] ?? null,
            selectedLabel:
              qn.options.find((o) => o.id === allAnswers[qmatId]?.[qn.id])
                ?.label ?? null,
            followup: allFollowups[qmatId]?.[qn.id] ?? '',
          }))
        : undefined,
    };
    // eslint-disable-next-line no-console
    console.log('[Export]', payload);
    // TODO: ship to the main process for actual file write.
    // For now, dump JSON to a Blob so the user can grab it from DevTools.
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qmatDoc?.name ?? 'qmat'}.${format}.preview.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const toggleInclude = (key: keyof IncludeFlags) =>
    setInclude((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Export Qualification Matrix"
      subtitle={
        sol && qmatDoc
          ? `${SAMPLE_REQUIREMENTS.length} requirements · ${sol.number}`
          : undefined
      }
      maxWidth={460}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={onDownload}>
            Download
          </button>
        </>
      }
    >
      <div className="label" style={{ marginTop: 4 }}>Format</div>
      <div className="export-format-row">
        {(['xlsx', 'csv', 'docx'] as Format[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`export-format-opt ${format === f ? 'selected' : ''}`}
            onClick={() => setFormat(f)}
          >
            {format === f ? '●' : '○'} .{f}
          </button>
        ))}
      </div>

      <div className="label">Include</div>
      <label className="checkbox-row">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={include.answers}
            onChange={() => toggleInclude('answers')}
          />
          Prospect answers &amp; follow-ups
        </span>
      </label>
      <label className="checkbox-row">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={include.citations}
            onChange={() => toggleInclude('citations')}
          />
          Citation list per requirement
        </span>
      </label>
      <label className="checkbox-row">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={include.confidence}
            onChange={() => toggleInclude('confidence')}
          />
          Confidence scores &amp; review flags
        </span>
      </label>
      <label className="checkbox-row">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={include.colors}
            onChange={() => toggleInclude('colors')}
          />
          Colour coding (pills &amp; confidence bars)
        </span>
      </label>

      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        Prototype build: Download saves a JSON preview of the payload. Real
        .xlsx / .csv / .docx output lands when the main-process export pipeline
        is wired up.
      </p>
    </Modal>
  );
};

export default ExportModal;

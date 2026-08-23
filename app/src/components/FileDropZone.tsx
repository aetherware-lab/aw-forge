import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { IconFileText, IconUpload } from '@/components/Icon';

export interface DroppedFile {
  /** Unique id for list management — stable across renders */
  id: string;
  name: string;
  /** Display string e.g. "4.2 MB" */
  size: string;
  /** The actual file, retained so callers can upload it (e.g. for extraction runs). */
  file: File;
}

interface FileDropZoneProps {
  files: DroppedFile[];
  onChange: (files: DroppedFile[]) => void;
  /** "tall" matches the full New Solicitation drop zone; "compact" for modals */
  variant?: 'tall' | 'compact';
  hint?: string;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const newId = (): string =>
  `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Drag-drop file UI. Accepts dropped/picked files and reports them as
 * {name,size} records — actual upload/parsing lands when the backend does.
 */
const FileDropZone: React.FC<FileDropZoneProps> = ({
  files,
  onChange,
  variant = 'tall',
  hint = 'PDF, DOCX · RFP, PWS, attachments, amendments',
}) => {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const next: DroppedFile[] = [];
    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i];
      next.push({ id: newId(), name: f.name, size: formatSize(f.size), file: f });
    }
    onChange([...files, ...next]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    accept(e.dataTransfer?.files ?? null);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    accept(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (id: string) => {
    onChange(files.filter((f) => f.id !== id));
  };

  return (
    <div>
      <div
        className={`dropzone ${variant} ${isOver ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isOver) setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="dropzone-prompt">
          <IconUpload size={14} /> Drag &amp; drop files here
        </div>
        <div className="dropzone-hint muted">
          or click to browse · {hint}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc"
          onChange={onPick}
          style={{ display: 'none' }}
        />
      </div>

      {files.length > 0 && (
        <div className="dropzone-files">
          {files.map((f) => (
            <div key={f.id} className="dropzone-file">
              <span><IconFileText size={13} /> {f.name}</span>
              <span className="muted dropzone-size">{f.size}</span>
              <button
                type="button"
                className="dropzone-remove"
                onClick={() => remove(f.id)}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;

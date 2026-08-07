import React, { useState, KeyboardEvent } from 'react';
import type { TagKey } from '@/types';

interface Suggestion {
  key: TagKey;
  label: string;
}

interface TagInputProps {
  value: TagKey[];
  onChange: (next: TagKey[]) => void;
  /** Suggested quick-add tags (rendered below the input) */
  suggestions?: Suggestion[];
  placeholder?: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { key: 'hot', label: 'Hot' },
  { key: 'warm', label: 'Warm' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'cold', label: 'Cold' },
  { key: 'pinned', label: 'Pinned' },
];

const TAG_LABELS: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  tracking: 'Tracking',
  cold: 'Cold',
  pinned: 'Pinned',
  rebid: 'Re-bid',
  'topic-cmmc': 'CMMC',
  'topic-cyber': 'Cyber',
  'topic-cloud': 'Cloud',
  'topic-health': 'Healthcare',
  'topic-agency': 'USACE',
  'topic-draft': 'Draft RFP',
  'topic-renewal': 'Renewal',
  'topic-sources': 'Sources Sought',
};

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = 'Type a tag and press Enter…',
}) => {
  const [draft, setDraft] = useState('');

  const add = (tag: TagKey) => {
    const t = String(tag).trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
  };

  const remove = (tag: TagKey) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) {
        add(draft.trim());
        setDraft('');
      }
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="tag-input">
        {value.map((t) => (
          <span key={t} className={`tag-pill ${t}`}>
            {TAG_LABELS[t] ?? t}
            <button
              type="button"
              className="x"
              onClick={() => remove(t)}
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={value.length ? '' : placeholder}
          className="tag-input-inner"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="tag-suggestions">
          <span className="muted">Suggested:</span>
          {suggestions.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`tag-pill ${s.key} suggest-btn`}
              onClick={() => add(s.key)}
              disabled={value.includes(s.key)}
            >
              + {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;

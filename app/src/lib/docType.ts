import type { DocumentType } from '@/types';

/** Best-effort guess at a source document's type from its filename. */
export const inferDocType = (filename: string): DocumentType => {
  if (/pws/i.test(filename)) return 'PWS';
  if (/amend/i.test(filename)) return 'Amendment';
  if (/rfp|w\d{6}/i.test(filename)) return 'RFP';
  return 'Attachment';
};

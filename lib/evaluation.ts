import type { assess, defaults, DocType, Values } from './loan';

export const evaluationStorageKey = 'loanflow.local-evaluations.v1';
export const assessmentVersion = 'secured-line-of-credit-v1';

export const improvementAreas = [
  'Document extraction',
  'Affordability',
  'Collateral assessment',
  'Proposal generation',
  'General assessment',
] as const;

type Rating = 'positive' | 'negative';
export type ImprovementArea = typeof improvementAreas[number];
export type AssessmentSnapshot = {
  financialValues: Values;
  assumptions: typeof defaults;
  requestedLimit: number;
  results: ReturnType<typeof assess>;
  missingDocuments: DocType[];
  pendingDocuments: DocType[];
};

export type EvaluationRecord = {
  id: string;
  applicantId: string;
  timestamp: string;
  rating: Rating;
  comments: string;
  improvementArea: ImprovementArea | null;
  assessment: AssessmentSnapshot;
  assessmentVersion: typeof assessmentVersion;
  status: 'Recorded' | 'Pending review';
};

export function createEvaluation({
  id, applicantId, timestamp, rating, comments, improvementArea, assessment,
}: Pick<EvaluationRecord, 'id' | 'applicantId' | 'timestamp' | 'rating' | 'comments' | 'improvementArea' | 'assessment'>): EvaluationRecord {
  const trimmed = comments.trim();
  if (rating === 'negative' && (!trimmed || !improvementArea)) {
    throw new Error('Enter feedback and select an improvement area.');
  }
  return {
    id, applicantId, timestamp, rating, assessment,
    comments: rating === 'negative' ? trimmed : '',
    improvementArea: rating === 'negative' ? improvementArea : null,
    assessmentVersion,
    status: rating === 'positive' ? 'Recorded' : 'Pending review',
  };
}

export function readEvaluations(storage: Pick<Storage, 'getItem'>): EvaluationRecord[] {
  const stored = storage.getItem(evaluationStorageKey);
  if (!stored) return [];
  const records: unknown = JSON.parse(stored);
  if (!Array.isArray(records)) throw new Error('Invalid local feedback history.');
  return records;
}

export function saveEvaluation(storage: Pick<Storage, 'getItem' | 'setItem'>, record: EvaluationRecord) {
  const records = [record, ...readEvaluations(storage)];
  storage.setItem(evaluationStorageKey, JSON.stringify(records));
  return records;
}

export function evaluationsForApplicant(records: EvaluationRecord[], applicantId: string) {
  return records.filter(record => record.applicantId === applicantId);
}

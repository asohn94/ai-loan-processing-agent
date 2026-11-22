import type { DocType } from './loan';

export const intakeTabs = [
  { id: 'document-processing', label: 'Document Processing' },
  { id: 'affordability', label: 'Affordability' },
  { id: 'credit-proposal', label: 'Credit Proposal' },
] as const;

export type IntakeTab = typeof intakeTabs[number]['id'];
export type WorkflowTarget = IntakeTab | 'human-review' | 'request-documents' | 'request-sent';
export type ReviewDecision = 'Pending review' | 'Approved in demo' | 'Rejected in demo';

export function retainOutstandingRequests(requested: DocType[], missing: DocType[]) {
  return requested.filter(type => missing.includes(type));
}

export function nextWorkflowAction({ processing, missing, unverified, limit, decision, proposalNeedsReview = false, requestSent = false }: {
  processing: boolean;
  missing: number;
  unverified: number;
  limit: number | null;
  decision: ReviewDecision;
  proposalNeedsReview?: boolean;
  requestSent?: boolean;
}): { target: WorkflowTarget; label: string; detail: string } {
  if (missing && requestSent) {
    return { target: 'request-sent', label: 'Request Sent', detail: 'Awaiting outstanding documents.' };
  }
  if (decision !== 'Pending review') {
    return { target: 'human-review', label: 'Review decision', detail: 'Review the recorded demo decision.' };
  }
  if (processing || unverified) {
    return { target: 'document-processing', label: 'Process Documents', detail: processing
      ? 'Check PDF processing progress.'
      : 'Review documents pending verification.' };
  }
  if (missing) {
    return { target: 'request-documents', label: 'Request Missing Documents', detail: 'Request outstanding documents before final underwriting.' };
  }
  if (limit === null || limit === 0) {
    return { target: 'affordability', label: limit === null ? 'Run Affordability Assessment' : 'Review Affordability', detail: limit === null
      ? 'Complete the financial information needed for the credit assessment.'
      : 'Review the credit request and assessment inputs.' };
  }
  if (proposalNeedsReview) {
    return { target: 'credit-proposal', label: 'Review Credit Proposal', detail: 'Check the proposed credit limit and terms before underwriting.' };
  }
  return { target: 'human-review', label: 'Go to Human Review', detail: 'Human underwriter to verify the findings and approve or reject the proposal.' };
}

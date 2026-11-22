export const intakeTabs = [
  { id: 'document-processing', label: 'Document Processing' },
  { id: 'affordability', label: 'Affordability' },
  { id: 'credit-proposal', label: 'Credit Proposal' },
] as const;

export type IntakeTab = typeof intakeTabs[number]['id'];
export type WorkflowTarget = IntakeTab | 'human-review' | 'request-documents';
export type ReviewDecision = 'Pending review' | 'Approved in demo' | 'Rejected in demo';

export function nextWorkflowAction({ processing, missing, unverified, limit, decision }: {
  processing: boolean;
  missing: number;
  unverified: number;
  limit: number | null;
  decision: ReviewDecision;
}): { target: WorkflowTarget; label: string; detail: string } {
  if (decision !== 'Pending review') {
    return { target: 'human-review', label: 'Review decision', detail: 'Review the recorded demo decision.' };
  }
  if (processing || unverified) {
    return { target: 'document-processing', label: 'Document Processing', detail: processing
      ? 'Check PDF processing progress.'
      : 'Review documents pending verification.' };
  }
  // An incomplete assessment takes precedence when it cannot produce a limit.
  if (missing && limit !== null) {
    return { target: 'request-documents', label: 'Request Missing Documents', detail: 'Request outstanding documents before final underwriting.' };
  }
  if (limit === null || limit === 0) {
    return { target: 'affordability', label: 'Affordability', detail: limit === null
      ? 'Complete the financial information needed for the credit assessment.'
      : 'Review the credit request and assessment inputs.' };
  }
  return { target: 'human-review', label: 'Human Review', detail: 'Human underwriter to verify the findings and approve or reject the proposal.' };
}

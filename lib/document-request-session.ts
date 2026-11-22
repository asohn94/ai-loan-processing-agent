import { types, type DocType } from './loan';

function requestKey(applicantId: string) {
  return 'loanflow.document-requests.v1.' + applicantId;
}

export function readRequestedDocuments(applicantId: string): DocType[] {
  try {
    const data: unknown = JSON.parse(window.sessionStorage.getItem(requestKey(applicantId)) ?? '[]');
    return Array.isArray(data) ? types.filter(type => data.includes(type)) : [];
  } catch {
    return [];
  }
}

export function saveRequestedDocuments(applicantId: string, requested: DocType[]) {
  try {
    const key = requestKey(applicantId);
    if (requested.length) window.sessionStorage.setItem(key, JSON.stringify(requested));
    else window.sessionStorage.removeItem(key);
  } catch {
    // In-memory request status still works when storage is blocked.
  }
}

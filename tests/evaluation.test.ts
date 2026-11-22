import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessmentVersion, createEvaluation, evaluationsForApplicant, readEvaluations, saveEvaluation } from '../lib/evaluation';
import { applicants, assess, defaults } from '../lib/loan';

const [john, jane] = applicants;
const assessment = {
  financialValues: jane.values, assumptions: defaults, requestedLimit: jane.request,
  results: assess(jane.values, jane.request, defaults), missingDocuments: [], pendingDocuments: [],
};
const base = {
  id: 'jane-1', applicantId: jane.id, timestamp:'2026-01-01T00:00:00.000Z',
  assessment, comments: '', improvementArea: 'Collateral assessment' as const,
};

function browserStorage() {
  const data = new Map<string, string>();
  return {getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => {data.set(key, value);}};
}

test('requires a substantive comment for negative feedback and records categorized status', () => {
  assert.throws(() => createEvaluation({...base, rating:'negative', comments:'  '}), /Enter feedback/);
  const record = createEvaluation({...base, rating:'negative', comments:' Check pledged assets. '});
  assert.equal(record.comments, 'Check pledged assets.');
  assert.equal(record.improvementArea, 'Collateral assessment');
  assert.equal(record.assessmentVersion, assessmentVersion);
  assert.equal(record.status, 'Pending review');
  assert.deepEqual(record.assessment, assessment);
});

test('persists separate applicant histories in one browser and isolates unrelated browsers', () => {
  const storage = browserStorage();
  const positive = createEvaluation({...base, rating:'positive'});
  assert.equal(positive.status, 'Recorded');
  assert.equal(positive.improvementArea, null);
  const negative = createEvaluation({...base, id:'john-1', applicantId:john.id, rating:'negative', comments:'Check the tax return.'});
  saveEvaluation(storage, positive);
  saveEvaluation(storage, negative);
  const reloaded = readEvaluations(storage);
  assert.deepEqual(evaluationsForApplicant(reloaded, jane.id), [positive]);
  assert.deepEqual(evaluationsForApplicant(reloaded, john.id), [negative]);
  assert.deepEqual(readEvaluations(browserStorage()), []);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assess, applicants, defaults, documentStatus, sampleDocs, types } from '../lib/loan';
import { intakeTabs, nextWorkflowAction, type ReviewDecision } from '../lib/workflow';

test('orders the Client Intake subtabs in origination sequence', () => {
  assert.deepEqual(intakeTabs.map(tab => tab.id), ['document-processing', 'affordability', 'credit-proposal']);
});

test('routes each applicant and workflow state to its next action', () => {
  const decision: ReviewDecision = 'Pending review';
  const base = {processing:false, missing:0, unverified:0, limit:95000, decision};
  for (const [index, applicant] of applicants.entries()) {
    const docs = sampleDocs(index);
    const missing = types.filter(type => documentStatus(docs, type) === 'Missing').length;
    const limit = assess(applicant.values, applicant.request, defaults).limit;
    const action = nextWorkflowAction({...base, missing, limit});
    assert.equal(action.target, index === 0 ? 'request-documents' : 'human-review');
  }
  assert.equal(nextWorkflowAction({...base, processing:true}).target, 'document-processing');
  assert.equal(nextWorkflowAction({...base, unverified:1}).target, 'document-processing');
  assert.equal(nextWorkflowAction({...base, limit:null}).target, 'affordability');
  assert.equal(nextWorkflowAction({...base, limit:0}).target, 'affordability');
  for (const decision of ['Approved in demo', 'Rejected in demo'] as const) {
    assert.equal(nextWorkflowAction({...base, decision}).label, 'Review decision');
  }
});

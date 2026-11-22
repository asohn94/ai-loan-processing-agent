import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assess, defaults, documentRequest, documentStatus, parseFields, resolveFields, sampleDocs, type DocumentRecord } from '../lib/loan';

test('parses supported labels and omits conflicting amounts', () => {
  assert.deepEqual(parseFields(['Annual income: $120,000.00', 'Closing balance = $22,120.50', 'Cash balance: $25,000', 'Monthly debt payments: $1,200']), {annual:120000, debt:1200});
});
test('uses browser-extracted income above the fictional profile and honors manual correction', () => {
  const doc: DocumentRecord = {id:'a',name:'tax.pdf',type:'Tax return',status:'Pending Verification',extraction:'extracted',values:{annual:96000}};
  const result = resolveFields([doc], {cash:40}, {monthly:9000,cash:25});
  assert.deepEqual(result.values, {annual:96000,monthly:8000,cash:40});
  assert.equal(result.sources.annual,'tax.pdf');
  assert.equal(result.sources.cash,'Human correction');
});
test('caps revolving credit by collateral and charges interest on the drawn balance', () => {
  const result = assess({monthly:10000,debt:1000,collateral:60000},100000,defaults);
  assert.equal(result.dti,10);
  assert.equal(result.incomeLimit,300000);
  assert.equal(result.collateralLimit,48000);
  assert.equal(result.limit,48000);
  assert.equal(result.monthlyInterest,290);
  assert.equal(result.qualifyingPayment,480);
  assert.equal(result.projected?.toFixed(1), '14.8');
});

test('caps credit by DTI or request and supports a zero APR', () => {
  const values = {monthly:5000,debt:1700,collateral:100000};
  assert.equal(assess(values,50000,defaults).limit,30000);
  const zero = assess(values,15000,{...defaults,rate:0});
  assert.equal(zero.limit,15000);
  assert.equal(zero.monthlyInterest,0);
  assert.equal(zero.qualifyingPayment,150);
  const highRate = assess(values,50000,{...defaults,rate:24});
  assert.equal(highRate.limit,15000);
  assert.equal(highRate.qualifyingPayment,highRate.monthlyInterest);
});

test('keeps extraction separate from illustrative verification and requests only missing documents', () => {
  const docs = sampleDocs(0);
  assert.equal(documentStatus(docs, 'Pay stub'), 'Received and Verified');
  assert.equal(documentStatus(docs, 'Tax return'), 'Missing');
  const uploaded: DocumentRecord = {
    id:'tax', name:'upload.pdf', type:'Tax return', status:'Pending Verification', extraction:'extracted', values:{annual:126000},
  };
  assert.equal(documentStatus([...docs, uploaded], 'Tax return'), 'Pending Verification');
  const message = documentRequest('John Smith', ['Tax return']);
  assert.match(message, /Dear John Smith/);
  assert.match(message, /• Tax return/);
  assert.doesNotMatch(message, /Pay stub/);
});

test('requires underwriting inputs and can return zero capacity', () => {
  assert.equal(assess({monthly:4000},50000,defaults).limit,null);
  assert.equal(assess({monthly:4000,debt:3200,collateral:100000},50000,defaults).limit,0);
});

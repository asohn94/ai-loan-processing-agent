import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assess, defaults, parseFields, resolveFields, type DocumentRecord } from '../lib/loan';

test('parses supported labels and omits conflicting amounts', () => {
  assert.deepEqual(parseFields(['Annual income: $120,000.00', 'Closing balance = $22,120.50', 'Cash balance: $25,000', 'Monthly debt payments: $1,200']), {annual:120000, debt:1200});
});
test('uses browser-extracted income above the simulated profile and honors manual correction', () => {
  const doc: DocumentRecord = {id:'a',name:'tax.pdf',type:'Tax return',status:'Extracted',values:{annual:96000}};
  const result = resolveFields([doc], {cash:40}, {monthly:9000,cash:25});
  assert.deepEqual(result.values, {annual:96000,monthly:8000,cash:40});
  assert.equal(result.sources.annual,'tax.pdf');
  assert.equal(result.sources.cash,'Human correction');
});
test('caps the principal by collateral and supports zero-interest terms', () => {
  const result = assess({monthly:10000,debt:1000,collateral:60000},100000,{...defaults,rate:0,years:10});
  assert.equal(result.dti,10);
  assert.equal(result.capacity,360000);
  assert.equal(result.amount,48000);
  assert.equal(result.payment,400);
  assert.equal(result.coverage,125);
});
test('requires underwriting inputs and can return zero capacity', () => {
  assert.equal(assess({monthly:4000},50000,defaults).amount,null);
  assert.equal(assess({monthly:4000,debt:3200,collateral:100000},50000,defaults).amount,0);
});

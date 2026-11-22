import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { applicants, parseFields } from '../lib/loan';
import { pdfLines } from '../lib/pdf';

test('extracts labeled income, cash, debt, investments and collateral from bundled PDFs', async () => {
  const lines = [];
  for (const name of ['pay-stub','bank-statement','tax-return','asset-statement']) {
    const data = new Uint8Array(await readFile('public/samples/0-' + name + '.pdf'));
    const task = getDocument({data, useSystemFonts: true});
    try {
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      lines.push(...pdfLines((await page.getTextContent()).items));
    } finally {
      await task.destroy();
    }
  }
  assert.deepEqual(parseFields(lines), applicants[0].values);
});

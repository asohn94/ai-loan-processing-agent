import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { applicants, parseFields, samples } from '../lib/loan';
import { pdfLines } from '../lib/pdf';

for (const [index, applicant] of applicants.entries()) {
  test('extracts financial values from bundled PDFs for ' + applicant.name, async () => {
    const lines = [];
    for (const name of samples) {
      const data = new Uint8Array(await readFile('public/samples/' + index + '-' + name + '.pdf'));
      const task = getDocument({data, useSystemFonts: true});
      try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const documentLines = pdfLines((await page.getTextContent()).items);
        assert.ok(documentLines.includes(applicant.name + ' / ' + applicant.id));
        lines.push(...documentLines);
      } finally {
        await task.destroy();
      }
    }
    assert.deepEqual(parseFields(lines), applicant.values);
  });
}

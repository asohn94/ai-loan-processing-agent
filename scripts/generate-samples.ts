import { writeFileSync } from 'node:fs';
import { applicants, fields, samples, types, type Field } from '../lib/loan';

const groups: Field[][] = [['monthly'], ['cash', 'debt'], ['annual'], ['investments', 'collateral']];
const usd = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
for (const [index, person] of applicants.entries()) {
  for (const [i, type] of types.entries()) {
    const lines = ['LoanFlow | Fictional document', type, person.name + ' / ' + person.id, ...groups[i].map(key => fields[key] + ': ' + usd.format(person.values[key])), 'Portfolio demo only'];
    const text = ['BT /F1 16 Tf 48 740 Td', ...lines.map((line, row) => (row ? '0 -30 Td ' : '') + '(' + line + ') Tj'), 'ET'].join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ' + Buffer.byteLength(text) + ' >>\nstream\n' + text + '\nendstream',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((object, n) => {
      const offset = Buffer.byteLength(pdf);
      pdf += (n + 1) + ' 0 obj\n' + object + '\nendobj\n';
      return offset;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    writeFileSync('public/samples/' + index + '-' + samples[i] + '.pdf', pdf);
  }
}

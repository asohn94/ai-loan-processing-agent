import { parseFields } from './loan';

export async function extractPdf(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error('PDF exceeds the 10 MB limit.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new Error('File is not a valid PDF.');
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({data: bytes});
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 50) throw new Error('PDF exceeds the 50-page limit.');
    const lines: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      lines.push(...pdfLines(content.items));
    }
    const values = parseFields(lines);
    return { values, detail: Object.keys(values).length ? 'Matched labeled text in PDF' : lines.some(line => line.trim()) ? 'No supported financial labels matched' : 'No selectable text found. Scanned PDFs require OCR.' };
  } finally {
    await task.destroy();
  }
}


export function pdfLines(items: Awaited<ReturnType<import('pdfjs-dist').PDFPageProxy['getTextContent']>>['items']) {
  const result: string[] = [];
  let line = '';
  let priorY: number | undefined;
  for (const item of items) {
    if (!('str' in item)) continue;
    const y = item.transform[5];
    if (priorY !== undefined && Math.abs(priorY - y) > 2 && line) {
      result.push(line);
      line = '';
    }
    line += (line ? ' ' : '') + item.str;
    priorY = y;
    if (item.hasEOL) {
      result.push(line); line = '';
    }
  }
  if (line) result.push(line);
  return result;
}

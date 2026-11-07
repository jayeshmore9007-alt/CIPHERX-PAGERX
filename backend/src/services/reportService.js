// reportService.js - HTML and PDF export of completed analysis reports.
// Reports exist only for jobs in DONE or DONE_WITH_ERRORS states.
const PDFDocument = require('pdfkit');

function buildReport(job) {
  if (!job) return null;
  if (!['DONE', 'DONE_WITH_ERRORS'].includes(job.state)) return null;
  const done = (job.steps || []).filter((s) => s.state === 'DONE');
  const lines = [];
  lines.push(`CIPHERX AI Analysis Report`);
  lines.push(`Job: ${job.id} | State: ${job.state} | Created: ${job.createdAt}`);
  lines.push('');
  for (const s of job.steps || []) {
    lines.push(`=== ${s.agent} (${s.name}) - ${s.state} ===`);
    if (s.output && s.output.hint) lines.push(`Hint: ${s.output.hint}`);
    if (s.output && s.output.ai && s.output.ai.summary) lines.push(`AI summary (${s.output.ai.provider || 'none'}): ${s.output.ai.summary}`);
    lines.push(JSON.stringify(s.output, null, 2).slice(0, 4000));
    lines.push('');
  }
  if (done.length === 0) lines.push('(No steps completed successfully - see job steps for details.)');
  return lines.join('\n');
}

function toHtml(job) {
  const text = buildReport(job);
  if (text === null) return null;
  const body = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>CIPHERX AI Report ${job.id}</title>
<style>body{background:#000;color:#0f8;font-family:monospace;padding:24px}h1{color:#00FF9C}</style>
</head><body><h1>CIPHERX AI</h1><pre>${body}</pre></body></html>`;
}

function streamPdf(job, writable) {
  const text = buildReport(job);
  if (text === null) return false;
  const doc = new PDFDocument();
  doc.pipe(writable);
  doc.fontSize(18).fillColor('#009966').text('CIPHERX AI Analysis Report');
  doc.fontSize(10).fillColor('#222').text(`Job: ${job.id} | State: ${job.state}`);
  doc.moveDown();
  doc.fontSize(9);
  for (const line of text.split('\n')) {
    doc.text(line, { width: 500 });
  }
  doc.end();
  return true;
}

module.exports = { buildReport, toHtml, streamPdf };

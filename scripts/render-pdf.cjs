#!/usr/bin/env node
/**
 * Common PDF management for the INSA submission documents.
 *
 * Renders the HTML masters to printable PDFs with headless Chrome, then audits
 * each result: page count, horizontal padding (content must not run edge to
 * edge on the x axis), and running-header/footer artifacts. The HTML source is
 * the master: edit the .html, re-run this, and the PDF is regenerated with its
 * layout checkable in the same command.
 *
 * Usage:
 *   node scripts/render-pdf.js                       # legacy: renders INSA_Security_Submission
 *   node scripts/render-pdf.js --src <html|pdf> --out <pdf>
 *   node scripts/render-pdf.js --all                 # every docs/insa/*.html → sibling .pdf
 *   node scripts/render-pdf.js --verify [--all|--src <html|pdf>]  # audit existing PDFs only
 *
 * Every render is followed by the same audit. Exit code 1 on any finding.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SRC = path.join(ROOT, 'docs/insa/INSA_Security_Submission.html');
const INSA_DIR = path.join(ROOT, 'docs/insa');

// PDF page geometry. The page content stream is emitted in a user space where
// the outer matrix is `0.23999999 0 0 -0.23999999 0 841.91998 cm`; the clip
// rect `187.5 237.5 2102.3926 3059.0332 re W* n` is the content box. Inner
// coordinates below are CSS px inside that box (1mm = 25.4/96 px), so the A4
// content box is 673px wide and body `padding: 0 6mm` should inset all text to
// x ≈ 22.7px.
const U = 0.23999999;
const PX = 3.1249273;
const BOX_LEFT = 187.5;
const BOX_TOP = 237.5;
const PAGE_TOP = 841.91998;
const MM_PER_PX = 25.4 / 96;
const LEFT_EDGE_MIN_PX = 20;

const CANDIDATES =
  process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ]
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

function findBrowser() {
  return CANDIDATES.find(c => (c.includes('/') ? fs.existsSync(c) : true));
}

function renderOne(browser, src, out) {
  if (!fs.existsSync(src)) {
    console.error(`Source document not found: ${src}`);
    process.exit(1);
  }

  // Chrome writes noisy display-link errors to stderr in headless mode; they are
  // harmless, so only the result line is surfaced.
  const args = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${out}`,
    `file://${src}`,
  ];

  const bin = process.env.CHROME_PATH || browser;
  try {
    execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    console.error(`PDF rendering failed for ${path.relative(ROOT, src)}.`);
    console.error((err.stderr || '').toString().split('\n').slice(-5).join('\n'));
    process.exit(1);
  }

  if (!fs.existsSync(out)) {
    console.error(`Render reported success but ${out} is missing.`);
    process.exit(1);
  }

  const size = fs.statSync(out).size;
  console.log(`Rendered ${path.relative(ROOT, out)} (${(size / 1024).toFixed(0)} KiB)`);
}

function mul(m1, m2) {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

// Resolves the content stream of object `num` using its /Length, independent of
// any "endobj"/"obj" byte sequences inside the compressed data.
function contentStream(s, num) {
  const p = s.indexOf(`\n${num} 0 obj`);
  if (p < 0) return null;
  const si = s.indexOf('stream', p);
  if (si < 0) return null;
  const len = s.slice(p, si).match(/\/Length\s+(\d+)/);
  if (!len) return null;
  const start = s.indexOf('\n', si + 6);
  if (start < 0) return null;
  const raw = Buffer.from(s.slice(start + 1, start + 1 + Number(len[1])), 'latin1');
  try {
    return zlib.inflateSync(raw).toString('latin1');
  } catch {
    return raw.toString('latin1');
  }
}

// Walks the page tree, returning each page's concatenated content stream in
// page order.
function readPages(pdf) {
  const s = fs.readFileSync(pdf).toString('latin1');
  const refs = [];
  const re = /(\d+) 0 obj([\s\S]*?)\nendobj/g;
  let m;
  while ((m = re.exec(s))) {
    const body = m[2];
    if (!/\/Type\s*\/Page\b/.test(body) || /\/Type\s*\/Pages/.test(body)) continue;
    const direct = body.match(/\/Contents\s+(\d+) 0 R/);
    const array = body.match(/\/Contents\s*\[([^\]]*)\]/);
    if (direct) refs.push([Number(direct[1])]);
    else if (array)
      refs.push((array[1].match(/(\d+) 0 R/g) || []).map(r => Number(r.replace(' 0 R', ''))));
    else refs.push([]);
  }
  const pages = refs.map((nums, i) => {
    const stream = nums
      .map(n => contentStream(s, n))
      .filter(Boolean)
      .join('\n');
    return { num: i + 1, stream: stream || null };
  });
  const declared = (s.match(/\/Type\s*\/Page\b/g) || []).length;
  return { declared, pages };
}

// Tracks the q/Q + cm matrix stack and converts every text baseline and box
// fill to content-box coordinates (ix, iy from top-left, in CSS px).
function pageLayout(stream) {
  const lines = stream.split('\n');
  const stack = [];
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const texts = [];
  const boxes = [];
  for (let li = 0; li < lines.length; li++) {
    const ln = lines[li];
    let mm;
    if (ln === 'q') stack.push(m);
    else if (ln === 'Q') m = stack.pop() || m;
    else if ((mm = ln.match(/^([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm$/))) {
      const v = mm.slice(1).map(Number);
      m = mul(m, { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] });
    } else if ((mm = ln.match(/^([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re$/))) {
      const next = (lines[li + 1] || '').trim();
      if (next === 'W* n' || next === 'W n') continue;
      const x = Number(mm[1]);
      const y = Number(mm[2]);
      const w = Number(mm[3]);
      boxes.push({
        ix: (m.a * x + m.c * y + m.e) / U / PX - BOX_LEFT / PX,
        iw: Math.abs(m.a * w) / U / PX,
        iy: (PAGE_TOP - (m.b * x + m.d * y + m.f)) / U / PX - BOX_TOP / PX,
        h: Math.abs(m.d * Number(mm[4])) / U / PX,
      });
    } else if ((mm = ln.match(/^1 0 0 -1 ([-\d.]+) ([-\d.]+) Tm$/))) {
      const tx = Number(mm[1]);
      const ty = Number(mm[2]);
      texts.push({
        ix: (m.a * tx + m.c * ty + m.e) / U / PX - BOX_LEFT / PX,
        iy: (PAGE_TOP - (m.b * tx + m.d * ty + m.f)) / U / PX - BOX_TOP / PX,
      });
    }
  }
  return { texts, boxes };
}

function auditPdf(pdf) {
  const { declared, pages } = readPages(pdf);
  const findings = [];
  let minTextX = Infinity;
  let textCount = 0;
  const edgeBoxes = [];
  const unreadable = [];

  for (const page of pages) {
    if (!page.stream) {
      unreadable.push(page.num);
      continue;
    }
    const { texts, boxes } = pageLayout(page.stream);
    for (const t of texts) {
      textCount++;
      if (t.ix < minTextX) minTextX = t.ix;
    }
    for (const b of boxes) {
      if (b.ix >= -1 && b.ix <= 1 && b.iw >= 660 && b.iw <= 690) {
        edgeBoxes.push(`p${page.num}@y=${b.iy.toFixed(0)}`);
      }
    }
  }

  if (declared === 0) findings.push('page count failed');
  if (textCount === 0) findings.push('no readable page text');
  if (unreadable.length)
    findings.push(`unreadable content stream on page(s) ${unreadable.join(', ')}`);
  if (edgeBoxes.length) {
    findings.push(
      `full-width box flush with the content edge (no horizontal padding or a ` +
        `header/footer artifact): ${edgeBoxes.join(', ')}`,
    );
  }
  if (minTextX < LEFT_EDGE_MIN_PX) {
    findings.push(
      `text starts ${(minTextX * MM_PER_PX).toFixed(1)}mm from the content edge ` +
        `(< ${(LEFT_EDGE_MIN_PX * MM_PER_PX).toFixed(1)}mm) — horizontal padding missing`,
    );
  }

  return { pageCount: declared, minTextX, findings };
}

function report(pdf) {
  const a = auditPdf(pdf);
  const left = (a.minTextX === Infinity ? 0 : a.minTextX) * MM_PER_PX;
  const status = a.findings.length ? 'FAIL' : 'ok';
  console.log(
    `${status} ${path.relative(ROOT, pdf)}: ${a.pageCount} pages | left padding ${left.toFixed(1)}mm`,
  );
  for (const f of a.findings) console.log(`     - ${f}`);
  return a.findings.length === 0;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : null;
  };
  const verifyOnly = argv.includes('--verify');
  const all = argv.includes('--all');

  const browser = verifyOnly ? null : findBrowser();
  if (!verifyOnly && !browser) {
    console.error('No Chrome/Chromium/Edge binary found. Install one or set CHROME_PATH.');
    process.exit(1);
  }

  const srcArg = flag('--src');
  const outArg = flag('--out');
  const jobs = [];
  if (all) {
    const sources = fs
      .readdirSync(INSA_DIR)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(INSA_DIR, f));
    if (sources.length === 0) {
      console.error(`No HTML masters found in ${INSA_DIR}`);
      process.exit(1);
    }
    for (const src of sources) jobs.push({ src, out: src.replace(/\.html$/, '.pdf') });
  } else if (srcArg && srcArg.endsWith('.pdf')) {
    jobs.push({ src: null, out: path.resolve(ROOT, srcArg) });
  } else {
    const src = srcArg ? path.resolve(ROOT, srcArg) : DEFAULT_SRC;
    const out = outArg ? path.resolve(ROOT, outArg) : src.replace(/\.html$/, '.pdf');
    jobs.push({ src, out });
  }

  let ok = true;
  for (const job of jobs) {
    if (!verifyOnly) renderOne(browser, job.src, job.out);
    if (!fs.existsSync(job.out)) {
      console.error(`Missing PDF: ${path.relative(ROOT, job.out)}`);
      ok = false;
      continue;
    }
    ok = report(job.out) && ok;
  }

  if (!verifyOnly) console.log(`Using ${process.env.CHROME_PATH || browser} on ${os.platform()}`);
  if (!ok) process.exitCode = 1;
}

main();

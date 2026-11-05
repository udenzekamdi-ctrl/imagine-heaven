// Imagine Heaven — prayer document → narration script.
// Usage: node scripts/prepare_script.mjs "<prayers.txt>" [out_dir]
// Produces narration_script.json (segments for TTS + overlays) and narration_script.txt (clean, human-readable),
// plus a verification report comparing every word of the source against the narration.
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2] ?? 'prayers restoration.txt';
const outDir = process.argv[3] ?? 'scripts';
const raw = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

// ---------- number words ----------
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n) {
  n = Number(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  const h = Math.floor(n / 100), r = n % 100;
  return ONES[h] + ' hundred' + (r ? ' and ' + words(r) : '');
}
const ORD = { 1: 'First', 2: 'Second', 3: 'Third' };

// "1 John 1:9" → "First John, chapter one, verse nine"
// "Hebrews 12:22-24" → "Hebrews, chapter twelve, verses twenty-two to twenty-four"
// Psalms are read "Psalm one hundred and forty-seven, verse three" (natural liturgical phrasing).
const REF = /\b(?:([1-3])\s)?([A-Z][a-z]+(?:\s(?:of\s)?[A-Z][a-z]+)?)\s(\d{1,3}):(\d{1,3})(?:\s?[-–—]\s?(\d{1,3}))?/g;
function speakRef(_m, num, book, ch, v1, v2) {
  const b = (num ? ORD[num] + ' ' : '') + book;
  const verses = v2 ? `verses ${words(v1)} to ${words(v2)}` : `verse ${words(v1)}`;
  if (/^Psalms?$/.test(book)) return `Psalm ${words(ch)}, ${verses}`;
  return `${b}, chapter ${words(ch)}, ${verses}`;
}
function displayRef(_m, num, book, ch, v1, v2) {
  return `${num ? num + ' ' : ''}${book} ${ch}:${v1}${v2 ? '–' + v2 : ''}`;
}

function clean(text) {
  return text
    .replace(/\s*[—-]?\s*\bKJV\b/g, '')            // never say KJV
    .replace(/King James Version/gi, '')
    .replace(/\*\*|\*|__|`/g, '')                    // markdown emphasis
    .replace(/\bLORD'S\b/g, "Lord's").replace(/\bLORD\b/g, 'Lord') // avoid spelled-out caps
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ---------- parse ----------
const lines = raw.split('\n');
const segments = [];
let cur = null;
const push = () => { if (cur && cur.body.trim()) segments.push(cur); };
for (const line of lines) {
  const h = line.match(/^(#{1,6})\s*(.*)$/);
  if (h) {
    const title = h[2].trim();
    const num = title.match(/^(\d+)\.\s*(.*)$/);
    if (/introduction/i.test(title)) { push(); cur = { kind: 'intro', title, body: '' }; }
    else if (num) { push(); cur = { kind: 'prayer', number: +num[1], title: num[2], body: '' }; }
    else { push(); cur = { kind: 'heading', title, body: '' }; } // document headings are not narrated
    continue;
  }
  if (/^\s*-{3,}\s*$/.test(line)) continue;
  if (cur) cur.body += line + '\n';
}
push();

// Environment mapping (emotional progression). Override per script via env_map.json if present.
function envFor(seg) {
  if (seg.kind === 'intro') return 'courts_entrance';
  const n = seg.number;
  if (n <= 4) return 'courts_entrance';     // humility, repentance, mercy, approaching the court
  if (n <= 7) return 'courts_hall';         // presenting petitions, removing barriers
  if (n <= 15) return 'gardens';            // spiritual / mental / emotional / physical / relational restoration
  if (n <= 24) return 'valley';             // strength, peace, joy, purpose, breaking cycles
  return 'horizon';                         // family, hope, fruitfulness, new beginning, final declaration
}

const out = [];
for (const seg of segments) {
  if (seg.kind === 'heading') continue;
  const paragraphs = seg.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const refs = [];
  const spokenParas = paragraphs.map(p => {
    let t = clean(p);
    // Intro-style pull quote: “quote” — Ref  → Ref. “quote”
    t = t.replace(/^(“[^”]+”)\s*[—–-]\s*(.+)$/, (_m, q, r) => `${r.trim()}. ${q}`);
    // capture overlays (reference + quotation that follows it)
    const re = new RegExp(REF.source, 'g');
    let m;
    while ((m = re.exec(t))) {
      const after = t.slice(m.index);
      const q = after.match(/“([^”]+)”/);
      refs.push({ ref: displayRef(...m), quote: q ? q[1] : null });
    }
    t = t.replace(REF, speakRef);
    // "declares in Ref, “…" → colon before quotations reads more naturally
    t = t.replace(/(verses? [a-z -]+),\s*“/g, '$1: “');
    t = t.replace(/(verses? [a-z -]+)\.\s*“/g, '$1. “');
    return t;
  });
  const id = seg.kind === 'intro' ? 'p00_intro' : `p${String(seg.number).padStart(2, '0')}`;
  out.push({
    id,
    kind: seg.kind,
    title: seg.title,              // for reference only — never narrated or shown
    environment: envFor(seg),
    tone: /physical|emotional|mental|healing|peace|joy|hope/i.test(seg.title) ? 'gentle' :
          /declaration|break|remove|silence/i.test(seg.title) ? 'authoritative' : 'reverent',
    text: spokenParas.join('\n\n'),
    overlays: refs,
  });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'narration_script.json'), JSON.stringify({ source: path.basename(src), segments: out }, null, 2));
fs.writeFileSync(path.join(outDir, 'narration_script.txt'), out.map(s => s.text).join('\n\n\n'));

// ---------- verification ----------
// Every word of the source prayer body (minus headings/markup/KJV/ref digits) must appear in order in the narration.
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
const report = [];
let allOk = true;
for (const seg of segments) {
  if (seg.kind === 'heading') continue;
  const id = seg.kind === 'intro' ? 'p00_intro' : `p${String(seg.number).padStart(2, '0')}`;
  const spoken = norm(out.find(o => o.id === id).text);
  const source = norm(clean(seg.body).replace(REF, (_m, n, b) => `${n ? ORD[n] : ''} ${b}`));
  // count-based: every source word must be spoken at least as many times as it is written
  const cnt = {}; for (const w of spoken) cnt[w] = (cnt[w] || 0) + 1;
  const missing = [];
  for (const w of source) { if (cnt[w] > 0) cnt[w]--; else missing.push(w); }
  const forbidden = spoken.filter(w => w === 'kjv');
  const ok = !missing.length && !forbidden.length && !/\*|#/.test(out.find(o => o.id === id).text);
  allOk &&= ok;
  report.push(`${ok ? 'OK  ' : 'FAIL'} ${id}  source words ${source.length}, spoken words ${spoken.length}${missing.length ? '  MISSING: ' + missing.join(' ') : ''}`);
}
const expectedPrayers = Math.max(...segments.filter(s => s.kind === 'prayer').map(s => s.number));
const found = out.filter(s => s.kind === 'prayer').length;
report.push(`Prayers found: ${found} of ${expectedPrayers}; intro: ${out.some(s => s.kind === 'intro') ? 'yes' : 'no'}`);
report.push(`Total narration characters: ${out.reduce((a, s) => a + s.text.length, 0)}`);
report.push(allOk && found === expectedPrayers ? 'RESULT: complete — nothing missing.' : 'RESULT: CHECK FAILURES ABOVE');
fs.writeFileSync(path.join(outDir, 'verification_report.txt'), report.join('\n'));
console.log(report.join('\n'));

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const htmlFiles = readdirSync(root).filter((file) => extname(file) === '.html').sort();
const jsonFiles = [
  'manifest.json',
  'asset/serverinfo.json',
  'controls/controls.json',
  'developer/developer.json',
  'map/map.json',
  'wiki/index.json',
];
const errors = [];
const warnings = [];

function report(list, file, message) {
  list.push(`${file}: ${message}`);
}

function checkScript(source, file, label) {
  try {
    Function(source);
  } catch (error) {
    report(errors, file, `${label} JavaScript syntax error — ${error.message}`);
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  const markup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  if (!/<html\b[^>]*\blang=["']ko["']/i.test(html)) report(errors, file, 'missing lang="ko"');
  if (!/<meta\b[^>]*charset=["']?utf-8/i.test(html)) report(errors, file, 'missing UTF-8 charset');
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) report(errors, file, 'missing viewport meta');
  if (!/<meta\b[^>]*name=["']description["']/i.test(html)) report(warnings, file, 'missing description meta');
  if (!/<title>[^<]+<\/title>/i.test(html)) report(errors, file, 'missing title');

  const ids = [...markup.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) report(errors, file, `duplicate id(s): ${duplicates.join(', ')}`);

  for (const match of markup.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(match[1])) report(errors, file, 'image is missing alt text');
  }

  for (const match of markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (!text && !/\b(?:aria-label|title)=["'][^"']+["']/i.test(match[1])) {
      report(errors, file, 'button is missing an accessible name');
    }
  }

  for (const match of markup.matchAll(/<input\b([^>]*)>/gi)) {
    const attrs = match[1];
    if (/\btype=["']hidden["']/i.test(attrs)) continue;
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    const hasLabel = /\b(?:aria-label|aria-labelledby)=["'][^"']+["']/i.test(attrs)
      || (id && new RegExp(`<label\\b[^>]*\\bfor=["']${id}["']`, 'i').test(markup));
    if (!hasLabel) report(warnings, file, `input${id ? ` #${id}` : ''} may be missing a label`);
  }

  for (const match of markup.matchAll(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi)) {
    if (!/\brel=["'][^"']*noopener/i.test(match[1])) {
      report(errors, file, 'target="_blank" link is missing rel="noopener"');
    }
  }

  for (const match of markup.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) {
    const reference = match[1].trim();
    if (!reference || /^(?:#|data:|https?:|mailto:|matz-client:|javascript:|\$\{)/i.test(reference)) continue;
    const clean = reference.split(/[?#]/)[0];
    const target = resolve(root, dirname(file), clean);
    if (!existsSync(target)) report(errors, file, `missing local asset: ${reference}`);
  }

  const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((match, index) => checkScript(match[1], file, `inline script #${index + 1}`));
}

for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(join(root, file), 'utf8'));
  } catch (error) {
    report(errors, file, `invalid JSON — ${error.message}`);
  }
}

checkScript(readFileSync(join(root, 'asset/script.js'), 'utf8'), 'asset/script.js', 'shared');

for (const message of warnings) console.warn(`WARN  ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);

console.log(`Checked ${htmlFiles.length} HTML pages and ${jsonFiles.length} JSON files.`);
if (warnings.length) console.log(`${warnings.length} warning(s).`);
if (errors.length) {
  console.error(`${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log('Site check passed.');
}

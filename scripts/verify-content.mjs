import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';

const source=parseHTML(readFileSync('wikipedia-source.html','utf8')).document.querySelector('#mw-content-text .mw-parser-output');
const built=parseHTML(readFileSync('public/index.html','utf8')).document;
const article=built.querySelector('#article-content');
const textList=(doc,selector)=>[...doc.querySelectorAll(selector)].map(el=>el.textContent.replace(/\s+/g,' ').trim());
for(const selector of ['p:not(.reference-empty)','h2,h3,h4','.reference-text','table.wikitable','.infobox','figcaption']) {
  assert.deepEqual(textList(article,selector),textList(source,selector),`Original text must be preserved: ${selector}`);
}
assert.deepEqual([...article.querySelectorAll('img')].map(el=>el.getAttribute('data-original-src')),[...source.querySelectorAll('img')].map(el=>new URL(el.getAttribute('src'),'https://en.wikipedia.org').href));
assert.equal(article.querySelectorAll('img:not([alt])').length,0);
// Related navigation preserves every link destination and every non-template label.
const sourceLinks=[...source.querySelectorAll('.navbox a')].map(a=>({href:new URL(a.getAttribute('href')||'./Jordan_Spieth','https://en.wikipedia.org/wiki/Jordan_Spieth').href,text:a.closest('.navbar')?'template control':a.textContent}));
const builtLinks=[...article.querySelectorAll('.navbox a')].map(a=>({href:a.getAttribute('href')||'https://en.wikipedia.org/wiki/Jordan_Spieth',text:a.closest('.navbar')?'template control':a.textContent}));
assert.deepEqual(builtLinks,sourceLinks,'All related article links and labels must remain intact.');
const ids=[...built.querySelectorAll('[id]')].map(el=>el.id);
assert.equal(new Set(ids).size,ids.length,'All IDs must be unique.');
for(const a of built.querySelectorAll('a[href^="#"]')) assert.ok(built.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))),`Broken anchor: ${a.getAttribute('href')}`);
for(const [filename,root] of [['public/index.html','public'],['index.html','.']]) {
  const doc=parseHTML(readFileSync(filename,'utf8')).document;
  for(const el of doc.querySelectorAll('img[src],script[src],link[rel="stylesheet"],link[rel="icon"],source[srcset]')) {
    const url=el.getAttribute('src')||el.getAttribute('href')||el.getAttribute('srcset');
    assert.ok(url.startsWith('./'),`Asset must work below the /UXDesign/ path: ${url}`);
    assert.ok(existsSync(path.resolve(root,url)),`Missing asset: ${url}`);
  }
  assert.equal(doc.querySelectorAll('#article-content img').length,89);
}
assert.ok(existsSync('public/.nojekyll')&&existsSync('.nojekyll'));
console.log('Content and deployment checks passed: original prose, tables, 99 references, 89 images, all related links, and local assets for both Pages publishing modes.');

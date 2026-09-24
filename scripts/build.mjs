import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { enhanceLayout } from './enhance-layout.mjs';

const source = readFileSync('wikipedia-source.html', 'utf8');
const { document } = parseHTML(source);
const article = document.querySelector('#mw-content-text .mw-parser-output');
if (!article) throw new Error('The source article was not found.');
const revision = source.match(/"wgRevisionId":(\d+)/)[1];
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const icons = {
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  heart:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  book:'<path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z"/>',
  talk:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8Z"/><path d="M7 8h9M7 12h6"/>',
  edit:'<path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15Z"/>', history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v6l4 2"/>',
  down:'<path d="m6 9 6 6 6-6"/>', right:'<path d="m9 5 7 7-7 7"/>', up:'<path d="m6 15 6-6 6 6"/>',
  list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/>', settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="var(--page)"/><circle cx="16" cy="17" r="3" fill="var(--page)"/>',
  language:'<path d="M3 5h12M9 2v3M12 5c-1 6-4 9-9 11M5 8c1 3 4 6 8 8M14 21l4-11 4 11M16 17h4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  moon:'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>', auto:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>',
  standard:'<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h6"/>', wide:'<rect x="2" y="4" width="20" height="16" rx="1.5"/><path d="M6 8h12M6 12h12M6 16h12"/>',
  access:'<circle cx="12" cy="4" r="2"/><path d="m4 8 8 2 8-2M12 10v5M12 15l-5 7M12 15l5 7"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>', speaker:'<path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>',
  stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>', pause:'<path d="M8 5v14M16 5v14"/>', check:'<path d="m5 12 4 4L19 6"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
};
const icon = (name,extra='') => `<svg class="icon ${extra}" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;

// Keep source text intact; only restructure the interface and reference containers.
const headings = [...article.querySelectorAll('h2,h3,h4')];
const topSections = [];
for (const heading of headings) {
  const item = { id: heading.id, text: heading.textContent, children: [], level: Number(heading.tagName[1]) };
  if (item.level === 2) topSections.push(item);
  else {
    const parent = topSections.at(-1);
    if(item.level === 4 && parent.children.length) parent.children.at(-1).children.push(item);
    else parent.children.push(item);
  }
  heading.setAttribute('tabindex', '-1');
}
let tocSequence = 0;
function renderItems(items, prefix = '') {
  return items.map((item,i) => {
    const number = prefix + (i+1);
    const id = `toc-children-${++tocSequence}`;
    return `<li><div class="toc-item"><a class="toc-link" href="#${escape(item.id)}"><span class="toc-number" aria-hidden="true">${number}</span><span>${escape(item.text)}</span></a>${item.children.length ? `<button class="toc-toggle" aria-expanded="false" aria-controls="${id}" aria-label="Expand ${escape(item.text)} subsections">${icon('right')}</button>` : ''}</div>${item.children.length ? `<ul class="toc-children" id="${id}" hidden>${renderItems(item.children, number+'.')}</ul>` : ''}</li>`;
  }).join('');
}
const toc = `<ul><li><div class="toc-item"><a class="toc-link" href="#top" aria-current="location">${icon('up')}<span>(Top)</span></a></div></li>${renderItems(topSections)}</ul>`;

const manifest = [];
function asset(url) {
  const absolute = new URL(url, 'https://en.wikipedia.org').href;
  let pathname = new URL(absolute).pathname;
  const extension = pathname.match(/\.(svg|png|jpg|jpeg|webp|gif)$/i)?.[0] || '.png';
  const filename = createHash('sha256').update(absolute).digest('hex').slice(0,14) + extension;
  if (!manifest.some(m=>m.url===absolute)) manifest.push({url:absolute,path:`media/${filename}`});
  return `./media/${filename}`;
}
const imageDescriptions = {
  'Travelers-092':'Jordan Spieth at the 2025 Travelers Championship',
  'Jordan_Spieth_signature':'Jordan Spieth’s signature',
  'Players_Championship_-_2014':'Jordan Spieth at the 2014 Players Championship',
  'after_winning_the_2015':'Jordan Spieth after winning the 2015 U.S. Open',
  'Jordan_Spieth_01':'Jordan Spieth playing golf',
  'Jordan_Spieth_04':'Jordan Spieth playing golf'
};
for (const img of article.querySelectorAll('img')) {
  const url = img.getAttribute('src');
  img.setAttribute('data-original-src', new URL(url,'https://en.wikipedia.org').href);
  img.setAttribute('src', asset(url));
  const srcset = img.getAttribute('srcset');
  if(srcset) img.setAttribute('data-original-srcset',srcset);
  img.removeAttribute('srcset');
  if (!img.hasAttribute('alt')) {
    const key = Object.keys(imageDescriptions).find(k=>url.includes(k));
    const caption = img.closest('figure')?.querySelector('figcaption')?.textContent;
    img.setAttribute('alt', caption?.trim() || imageDescriptions[key] || img.closest('a')?.getAttribute('title') || 'Illustration from the Jordan Spieth article');
  }
  // Empty alt is retained for decorative flags beside the same country name.
  if(img.getAttribute('alt') === '' && img.closest('a')?.getAttribute('href')?.includes('File:')) img.closest('a').setAttribute('aria-label',decodeURIComponent(url).split('/').at(-1).replace(/^\d+px-/,'').split('?')[0].replaceAll('_',' '));
  img.setAttribute('decoding','async');
}
for(const [i,img] of [...article.querySelectorAll('img')].entries()) img.setAttribute('loading',i===0?'eager':'lazy');
for(const node of article.querySelectorAll('script')) node.remove();
// Wikipedia uses some definition lists for visual grouping without term/definition pairs.
// Use neutral inline containers for those navigation groups while retaining every word.
for(const node of [...article.querySelectorAll('.navbox dl,.navbox dt,.navbox dd')]) {
  const replacement=document.createElement('span');
  for(const attr of [...node.attributes]) replacement.setAttribute(attr.name,attr.value);
  replacement.classList.add('nav-description-'+node.tagName.toLowerCase());
  while(node.firstChild) replacement.append(node.firstChild);
  node.replaceWith(replacement);
}
for(const node of article.querySelectorAll('*')) {
  for(const attr of [...node.attributes]) if(attr.name.startsWith('on') || ['data-mw','data-parsoid','about'].includes(attr.name)) node.removeAttribute(attr.name);
  if(node.tagName==='A') {
    const href=node.getAttribute('href');
    if(href && !href.startsWith('#')) node.setAttribute('href',new URL(href,'https://en.wikipedia.org/wiki/Jordan_Spieth').href);
    if(node.classList.contains('mw-file-description')) node.setAttribute('title','View original media and licensing on Wikipedia');
  }
}

const referencesSection = article.querySelector('#References').closest('section');
const referencesList = referencesSection.querySelector('ol.references');
const references = [...referencesList.children];
const refsTable = document.createElement('table');
refsTable.className='references-table';
refsTable.id='reference-table';
refsTable.innerHTML='<caption class="sr-only">Article references, with links back to their citations</caption><thead><tr><th scope="col">No.</th><th scope="col">Source &amp; citation</th><th scope="col">Back to text</th></tr></thead><tbody></tbody>';
for(const [i,ref] of references.entries()) {
  const row=document.createElement('tr');
  row.id=ref.id;
  row.setAttribute('tabindex','-1');
  row.setAttribute('data-reference',String(i+1));
  const backlink=ref.querySelector('.mw-cite-backlink');
  for(const [j,a] of [...backlink.querySelectorAll('a')].entries()) a.setAttribute('aria-label',`Back to citation ${i+1}${backlink.querySelectorAll('a').length>1 ? ', occurrence '+(j+1):''}`);
  const citation=ref.querySelector('.reference-text');
  citation.querySelector('cite a')?.classList.add('citation-primary');
  row.innerHTML=`<th scope="row">${i+1}</th><td class="reference-citation">${citation.outerHTML}</td><td class="reference-return">${backlink.outerHTML}</td>`;
  refsTable.querySelector('tbody').append(row);
}
referencesList.replaceWith(refsTable);
const refControls=document.createElement('div');
refControls.className='reference-controls';
refControls.innerHTML=`<span class="reference-count" id="reference-count" role="status" aria-live="polite">${references.length} references</span><div class="reference-search">${icon('search')}<label class="sr-only" for="reference-search">Search references</label><input id="reference-search" type="search" placeholder="Search references" aria-controls="reference-table" autocomplete="off"></div>`;
refsTable.before(refControls);
const empty=document.createElement('p');empty.className='reference-empty';empty.id='reference-empty';empty.hidden=true;empty.textContent='No references match your search. Try another name or keyword.';refsTable.after(empty);
for(const table of [...article.querySelectorAll('table.wikitable')]) {
  const wrapper=document.createElement('div');wrapper.className='article-table-scroll';wrapper.setAttribute('tabindex','0');wrapper.setAttribute('role','region');
  const section=table.closest('section'); const title=section?.querySelector('h2,h3,h4')?.textContent || 'Article results';
  wrapper.setAttribute('aria-label',`${title} table; scroll horizontally if needed`);
  table.replaceWith(wrapper);wrapper.append(table);
}
const categories = document.querySelector('#catlinks');
for(const a of categories.querySelectorAll('a')) a.setAttribute('href',new URL(a.getAttribute('href'),'https://en.wikipedia.org').href);
const languageLinks=[...document.querySelectorAll('a.interlanguage-link-target')].map(a=>`<a href="${escape(a.href)}" lang="${escape(a.getAttribute('lang')||'')}" hreflang="${escape(a.getAttribute('hreflang')||'')}">${escape(a.textContent)}</a>`).join('');
const logo=asset('/static/images/icons/enwiki-25.svg');
const wordmark=asset('/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg');
const tagline=asset('/static/images/mobile/copyright/wikipedia-tagline-en-25.svg');
const choice=(name,value,label,visual,checked=false)=>`<label class="choice"><input type="radio" name="${name}" value="${value}"${checked?' checked':''}><span class="choice-content">${visual}<span>${label}</span></span></label>`;
const appearance=(suffix='')=>`<div class="appearance-card">
<fieldset class="appearance-group"><legend>Text size</legend><div class="choice-options">${choice('size'+suffix,'small','Small','<span class="sample small" aria-hidden="true">A</span>')}${choice('size'+suffix,'standard','Standard','<span class="sample" aria-hidden="true">A</span>',true)}${choice('size'+suffix,'large','Large','<span class="sample large" aria-hidden="true">A</span>')}</div></fieldset>
<fieldset class="appearance-group"><legend>Width</legend><div class="choice-options">${choice('width'+suffix,'standard','Standard',icon('standard'),true)}${choice('width'+suffix,'wide','Wide',icon('wide'))}</div></fieldset>
<fieldset class="appearance-group"><legend>Color</legend><div class="choice-options">${choice('theme'+suffix,'auto','Automatic',icon('auto'))}${choice('theme'+suffix,'light','Light',icon('sun'),true)}${choice('theme'+suffix,'dark','Dark',icon('moon'))}</div></fieldset>
</div><button class="appearance-reset" data-reset-appearance>${icon('reset')}Reset appearance</button>`;
const setting=(key,title,description)=>`<label class="setting-row" for="setting-${key}"><span><strong>${title}</strong><small>${description}</small></span><input id="setting-${key}" type="checkbox" role="switch" data-setting="${key}"></label>`;
const wiki='https://en.wikipedia.org';
let html=`<!doctype html>
<html lang="en" data-size="standard" data-width="standard" data-theme="light">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="Jordan Spieth’s Wikipedia article with accessible navigation, reading preferences, and structured references."><title>Jordan Spieth — Wikipedia, accessible reading</title><link rel="icon" href="${logo}" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script></head>
<body id="top"><a class="skip-link" href="#main-content">Skip to article</a><div class="reading-progress" aria-hidden="true"></div>
<header class="site-header"><div class="brand-area"><button class="icon-button" data-open="main-menu" aria-label="Open main menu">${icon('menu')}</button><a class="brand" href="${wiki}/wiki/Main_Page" aria-label="Wikipedia, the free encyclopedia"><img class="brand-globe" src="${logo}" alt="" width="49" height="49"><span class="brand-type"><img class="brand-wordmark" src="${wordmark}" alt="Wikipedia" width="121" height="18"><img class="brand-tagline" src="${tagline}" alt="The Free Encyclopedia" width="117" height="13"></span></a></div>
<form class="search-form" action="${wiki}/w/index.php" method="get" role="search">${icon('search','search-icon')}<label for="wiki-search" class="sr-only">Search Wikipedia</label><input id="wiki-search" type="search" name="search" placeholder="Search Wikipedia" required><button type="submit">Search</button></form>
<nav class="account-actions" aria-label="Account"><a class="button donate" href="https://donate.wikimedia.org/wiki/Special:FundraiserRedirector?uselang=en&project=wikipedia">${icon('heart')}Donate</a><a class="button primary" href="${wiki}/w/index.php?title=Special:CreateAccount&returnto=Jordan+Spieth">Create account</a><a class="button secondary" href="${wiki}/w/index.php?title=Special:UserLogin&returnto=Jordan+Spieth">${icon('user')}Log in</a></nav></header>
<div class="page-layout"><aside class="sidebar contents-sidebar" aria-label="Contents"><div class="sidebar-header"><h2>${icon('list')}Contents</h2><button class="hide-button" data-hide="contents" aria-expanded="true" aria-controls="desktop-contents">Hide</button></div><nav class="toc-panel" id="desktop-contents" aria-label="Article sections">${toc}</nav><button class="button show-panel" data-show="contents">Show contents</button><div class="toc-footer">${icon('book')}On this page</div></aside>
<main class="article-column" id="main-content" tabindex="-1"><div class="title-row"><h1 id="article-title">Jordan Spieth</h1><button class="button language-button" data-open="languages-dialog">${icon('language')}${document.querySelectorAll('a.interlanguage-link-target').length} languages${icon('down','chevron')}</button></div>
<div class="article-toolbar"><nav class="nav-group" aria-label="Page type"><a class="active" href="#top" aria-current="page">${icon('book')}Article</a><a href="${wiki}/wiki/Talk:Jordan_Spieth">${icon('talk')}Talk</a></nav><div class="article-tools"><nav class="nav-group" aria-label="Article actions"><a class="active" href="#top" aria-current="page">Read</a><a href="${wiki}/w/index.php?title=Jordan_Spieth&action=edit">${icon('edit')}Edit</a><a href="${wiki}/w/index.php?title=Jordan_Spieth&action=history">${icon('history')}View history</a></nav><details class="tools-menu"><summary>Tools${icon('down')}</summary><div class="dropdown"><button data-print>Print this page</button><button data-permalink>Copy permanent link</button><a href="${wiki}/w/index.php?title=Special:CiteThisPage&page=Jordan_Spieth&id=${revision}">Cite this page</a><a href="${wiki}/w/index.php?title=Jordan_Spieth&action=info">Page information</a><a href="${wiki}/wiki/Special:WhatLinksHere/Jordan_Spieth">What links here</a><a href="https://commons.wikimedia.org/wiki/Category:Jordan_Spieth">Wikimedia Commons</a></div></details></div></div>
<div class="mobile-controls"><button class="button mobile-contents-button" data-open="contents-dialog">${icon('list')}Contents</button><button class="button" data-open="accessibility-dialog">${icon('settings')}Reading preferences</button></div>
<p class="article-subtitle">From Wikipedia, the free encyclopedia</p><noscript><p class="no-js-note">The complete article is available below. Enable JavaScript to use reading preferences, reference filtering, and collapsible navigation.</p></noscript>
<div class="article-content mw-body-content" id="article-content">${article.outerHTML}</div>
<div class="categories">${categories.outerHTML}</div><footer class="article-footer"><p>${document.querySelector('#footer-info-lastmod')?.innerHTML || ''}</p><p>Article text reproduced from <a href="${wiki}/w/index.php?title=Jordan_Spieth&oldid=${revision}">Wikipedia revision ${revision}</a>, by <a href="${wiki}/w/index.php?title=Jordan_Spieth&action=history">Wikipedia contributors</a>, under the <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 License</a>. Navigation, accessibility controls, and reference presentation have been adapted. Images retain their original source links and individual licenses.</p><p>This is an independent interface recreation and is not affiliated with the Wikimedia Foundation. Wikipedia® is a registered trademark of the Wikimedia Foundation, Inc.</p><nav aria-label="Footer"><a href="${wiki}/wiki/Wikipedia:About">About Wikipedia</a><a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy">Privacy policy</a><a href="${wiki}/wiki/Wikipedia:General_disclaimer">Disclaimers</a><a href="${wiki}/wiki/Wikipedia:Contact_us">Contact Wikipedia</a><a href="${wiki}/wiki/Jordan_Spieth">View original article</a></nav></footer></main>
<aside class="sidebar appearance-sidebar" aria-label="Appearance"><div class="sidebar-header"><h2>${icon('settings')}Appearance</h2><button class="hide-button" data-hide="appearance" aria-expanded="true" aria-controls="desktop-appearance">Hide</button></div><div class="appearance-body" id="desktop-appearance">${appearance()}</div><button class="button show-panel" data-show="appearance">Show appearance</button><button class="accessibility-card" data-open="accessibility-dialog"><span class="accessibility-icon">${icon('access')}</span><span><strong>Accessibility</strong><small>Make reading work for you</small></span>${icon('right')}</button><p class="source-note">Your reading preferences are saved on this device.</p><a class="back-to-top" href="#top">${icon('up')}Back to top</a></aside></div>
<button class="button primary floating-accessibility" data-open="accessibility-dialog">${icon('access')}Accessibility</button>
<dialog class="accessibility-dialog" id="accessibility-dialog" aria-labelledby="accessibility-title"><div class="dialog-header"><h2 id="accessibility-title">${icon('access')}Reading &amp; accessibility</h2><button class="icon-button" data-close aria-label="Close accessibility menu">${icon('close')}</button></div><div class="dialog-body"><p class="dialog-intro">Choose what makes reading comfortable for you. Your preferences apply across this article.</p>${appearance('-dialog')}<h3 class="dialog-section-title">Reading support</h3>${setting('high-contrast','Higher contrast','Stronger text, borders, and controls.')}${setting('text-spacing','Extra text spacing','More space between letters, words, and lines.')}${setting('underline-links','Underline article links','Make links recognizable beyond color.')}${setting('reduce-motion','Reduce motion','Turn off smooth scrolling and transitions.')}${setting('focus-reading','Focus on the article','Hide side panels for a quieter page.')}${setting('reading-guide','Reading guide','A movable guide to help follow each line.')}<h3 class="dialog-section-title">Listen to this article</h3><div class="read-controls"><button class="button secondary" id="read-aloud">${icon('speaker')}Read aloud</button><button class="button" id="pause-reading" disabled>${icon('pause')}Pause</button><button class="button" id="stop-reading" disabled>${icon('stop')}Stop</button></div><p class="reading-status" id="reading-status" role="status" aria-live="polite">Uses your browser’s available speech voices.</p></div><div class="dialog-footer"><small>Preferences stay on this device.</small><button class="button" id="reset-all">Reset all</button></div></dialog>
<dialog class="languages-dialog" id="languages-dialog" aria-labelledby="languages-title"><div class="dialog-header"><h2 id="languages-title">Read in another language</h2><button class="icon-button" data-close aria-label="Close language menu">${icon('close')}</button></div><div class="dialog-body languages-list">${languageLinks}</div></dialog>
<dialog class="contents-dialog" id="contents-dialog" aria-labelledby="contents-title"><div class="dialog-header"><h2 id="contents-title">Contents</h2><button class="icon-button" data-close aria-label="Close contents">${icon('close')}</button></div><div class="dialog-body"><nav class="toc-panel" aria-label="Article sections on mobile">${toc.replaceAll('toc-children-','mobile-toc-children-')}</nav></div></dialog>
<dialog class="menu-dialog" id="main-menu" aria-labelledby="menu-title"><div class="dialog-header"><h2 id="menu-title">Main menu</h2><button class="icon-button" data-close aria-label="Close main menu">${icon('close')}</button></div><nav class="dialog-body menu-links" aria-label="Wikipedia navigation"><a href="${wiki}/wiki/Main_Page">Main page</a><a href="${wiki}/wiki/Wikipedia:Contents">Contents</a><a href="${wiki}/wiki/Portal:Current_events">Current events</a><a href="${wiki}/wiki/Special:Random">Random article</a><a href="${wiki}/wiki/Wikipedia:About">About Wikipedia</a><a href="${wiki}/wiki/Wikipedia:Contact_us">Contact us</a><a href="${wiki}/wiki/Help:Contents">Help</a><a href="${wiki}/wiki/Help:Introduction">Learn to edit</a><a href="${wiki}/wiki/Wikipedia:Community_portal">Community portal</a><a href="${wiki}/wiki/Special:RecentChanges">Recent changes</a><a href="https://donate.wikimedia.org/wiki/Special:FundraiserRedirector?uselang=en&project=wikipedia">Donate</a><a href="${wiki}/wiki/Special:SpecialPages">Special pages</a></nav></dialog>
<div class="reading-guide-overlay" hidden aria-hidden="true"></div><div class="sr-only" id="announcement" role="status" aria-live="polite"></div></body></html>`;
// Preserve the complete original tools, navigation, and footer in addition to the article.
const outputDocument=parseHTML(html).document;
const sourceTools=[...document.querySelectorAll('#vector-page-tools .vector-menu')];
const toolsDropdown=outputDocument.querySelector('.tools-menu .dropdown');
const localTools=toolsDropdown.innerHTML;
toolsDropdown.innerHTML='';
for(const group of sourceTools) {
  const heading=group.querySelector('.vector-menu-heading');
  if(heading){const label=outputDocument.createElement('div');label.className='tools-group-label';label.textContent=heading.textContent.trim();toolsDropdown.append(label);}
  for(const link of group.querySelectorAll('a')) {
    const copy=outputDocument.createElement('a');
    copy.href=new URL(link.getAttribute('href'),'https://en.wikipedia.org').href;
    copy.textContent=link.textContent.trim();
    toolsDropdown.append(copy);
  }
}
if(!toolsDropdown.querySelector('a')) toolsDropdown.innerHTML=localTools;
const localLabel=outputDocument.createElement('div');localLabel.className='tools-group-label';localLabel.textContent='This recreation';toolsDropdown.append(localLabel);
const printButton=outputDocument.createElement('button');printButton.setAttribute('data-print','');printButton.textContent='Print this page';toolsDropdown.append(printButton);
const copyButton=outputDocument.createElement('button');copyButton.setAttribute('data-permalink','');copyButton.textContent='Copy permanent link';toolsDropdown.append(copyButton);
const mainMenu=outputDocument.querySelector('.menu-links');
const upload=outputDocument.createElement('a');upload.href='https://en.wikipedia.org/wiki/Wikipedia:File_Upload_Wizard';upload.textContent='Upload file';mainMenu.append(upload);
const footer=outputDocument.querySelector('.article-footer');
const footerNav=footer.querySelector('nav');
footerNav.innerHTML='';
for(const link of document.querySelectorAll('#footer-places a')) {
  const copy=outputDocument.createElement('a');copy.href=new URL(link.getAttribute('href'),'https://en.wikipedia.org').href;copy.textContent=link.textContent;footerNav.append(copy);
}
for(const id of ['footer-info-renderedwith','footer-info-copyright']) {
  const sourceItem=document.getElementById(id);
  if(sourceItem){const p=outputDocument.createElement('p');p.innerHTML=sourceItem.innerHTML;for(const a of p.querySelectorAll('a'))a.href=new URL(a.getAttribute('href'),'https://en.wikipedia.org').href;footerNav.before(p);}
}
const originalFooterIcons=document.querySelector('#footer-icons');
if(originalFooterIcons){
  const iconsContainer=outputDocument.createElement('ul');iconsContainer.className='footer-icons';
  iconsContainer.innerHTML=originalFooterIcons.innerHTML;
  for(const img of iconsContainer.querySelectorAll('img'))img.src=asset(img.getAttribute('src'));
  for(const source of iconsContainer.querySelectorAll('source'))source.setAttribute('srcset',asset(source.getAttribute('srcset')));
  footer.append(iconsContainer);
}
enhanceLayout(outputDocument, icon);
// Relative asset URLs work at both a domain root and a GitHub project subpath.
for(const node of outputDocument.querySelectorAll('[src],[href],[srcset]')) {
  for(const name of ['src','href','srcset']) {
    const value=node.getAttribute(name);
    if(value && /^\/(?!\/)/.test(value)) node.setAttribute(name,'.'+value);
  }
}
html='<!doctype html>\n'+outputDocument.documentElement.outerHTML;
mkdirSync('public/media',{recursive:true});
writeFileSync('public/index.html',html);
writeFileSync('public/.nojekyll','');
// A root entry also supports an existing main / (root) Pages configuration.
// Only local resource paths differ; this is the same complete document.
for(const node of outputDocument.querySelectorAll('[src],[href],[srcset]')) {
  for(const name of ['src','href','srcset']) {
    const value=node.getAttribute(name);
    if(value?.startsWith('./')) node.setAttribute(name,'./public/'+value.slice(2));
  }
}
writeFileSync('index.html','<!doctype html>\n'+outputDocument.documentElement.outerHTML);
writeFileSync('media-manifest.json',JSON.stringify(manifest,null,2));
writeFileSync('public/source-metadata.json',JSON.stringify({source:'https://en.wikipedia.org/wiki/Jordan_Spieth',revision,license:'CC BY-SA 4.0',originalArticleImages:article.querySelectorAll('img').length,references:references.length,headings:headings.length,assets:manifest.length},null,2));
console.log(`Built revision ${revision}: ${headings.length} headings, ${references.length} references, ${article.querySelectorAll('img').length} article images, ${manifest.length} unique assets.`);

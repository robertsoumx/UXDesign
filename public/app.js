const assetBase = new URL('.', document.currentScript.src);
const root = document.documentElement;
const defaults = { size: 'standard', width: 'standard', theme: 'light', 'high-contrast': false, 'text-spacing': false, 'underline-links': false, 'reduce-motion': false, 'focus-reading': false, 'reading-guide': false };
let preferences = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem('spieth-reading-preferences') || '{}');
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof saved[key] === 'boolean') preferences[key] = saved[key];
    if ({size:['small','standard','large'],width:['standard','wide'],theme:['auto','light','dark']}[key]?.includes(saved[key])) preferences[key] = saved[key];
  }
} catch { /* Reading works when browser storage is disabled. */ }
const colorPreference = matchMedia('(prefers-color-scheme: dark)');
const reduceMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const announcement = document.querySelector('#announcement');
function announce(message) { announcement.textContent = message; }
function applyPreferences() {
  root.dataset.size = preferences.size;
  root.dataset.width = preferences.width;
  root.dataset.theme = preferences.theme === 'auto' ? (colorPreference.matches ? 'dark' : 'light') : preferences.theme;
  for (const [key, value] of Object.entries(preferences)) if (typeof value === 'boolean') root.classList.toggle(key, value || (key === 'reduce-motion' && reduceMotionPreference.matches));
  document.querySelector('.reading-guide-overlay').hidden = !preferences['reading-guide'];
  document.querySelectorAll('.choice input').forEach(input => { input.checked = input.value === preferences[input.name.replace('-dialog', '')]; });
  document.querySelectorAll('[data-setting]').forEach(input => { input.checked = preferences[input.dataset.setting]; });
  try { localStorage.setItem('spieth-reading-preferences', JSON.stringify(preferences)); } catch { /* Preferences still apply for this session. */ }
}
applyPreferences();
colorPreference.addEventListener('change', applyPreferences);
reduceMotionPreference.addEventListener('change', applyPreferences);
document.querySelectorAll('.choice input').forEach(input => input.addEventListener('change', () => {
  const key = input.name.replace('-dialog', '');
  preferences[key] = input.value;
  applyPreferences();
  announce(`${key === 'size' ? 'Text size' : key === 'theme' ? 'Color' : 'Width'} set to ${input.value}.`);
}));
document.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('change', () => {
  preferences[input.dataset.setting] = input.checked;
  applyPreferences();
}));
document.querySelectorAll('[data-reset-appearance]').forEach(button => button.addEventListener('click', () => {
  for (const key of ['size', 'width', 'theme']) preferences[key] = defaults[key];
  applyPreferences(); announce('Appearance reset to default.');
}));
document.querySelector('#reset-all').addEventListener('click', () => {
  preferences = { ...defaults }; applyPreferences(); announce('All reading preferences reset.'); stopReading();
});

let dialogTrigger = null;
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  dialogTrigger = button;
  const dialog = document.getElementById(button.dataset.open);
  dialog.returnValue = '';
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    if (dialog.returnValue === 'navigate') return;
    const alternatives = [...document.querySelectorAll('[data-open]')].filter(button => button.dataset.open === dialog.id);
    const target = [dialogTrigger, ...alternatives].find(button => button && button.getClientRects().length > 0);
    target?.focus({ preventScroll: true });
  });
});

document.querySelectorAll('.toc-toggle').forEach(button => button.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', button.getAttribute('aria-label').replace(open ? /^Expand/ : /^Collapse/, open ? 'Collapse' : 'Expand'));
  document.getElementById(button.getAttribute('aria-controls')).hidden = !open;
}));
document.querySelectorAll('[data-hide],[data-show]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.hide || button.dataset.show;
  const sidebar = document.querySelector(`.${key === 'contents' ? 'contents' : 'appearance'}-sidebar`);
  const hide = button.hasAttribute('data-hide') && !sidebar.classList.contains('hide-panel');
  sidebar.classList.toggle('hide-panel', hide);
  const toggle = sidebar.querySelector('[data-hide]');
  toggle.textContent = hide ? 'Show' : 'Hide';
  toggle.setAttribute('aria-expanded', String(!hide));
  if (button.hasAttribute('data-show')) toggle.focus();
}));

const referenceSearch = document.querySelector('#reference-search');
const referenceRows = [...document.querySelectorAll('[data-reference]')];
function filterReferences() {
  const query = referenceSearch.value.trim().toLocaleLowerCase();
  let shown = 0;
  for (const row of referenceRows) {
    row.hidden = !row.textContent.toLocaleLowerCase().includes(query);
    if (!row.hidden) shown++;
  }
  document.querySelector('#reference-count').textContent = query ? `${shown} of ${referenceRows.length} references` : `${referenceRows.length} references`;
  document.querySelector('#reference-empty').hidden = shown > 0;
  document.querySelector('#reference-table').hidden = shown === 0;
}
referenceSearch.addEventListener('input', filterReferences);
function revealReference(target) {
  if (!target) return;
  for(let parent=target.parentElement;parent;parent=parent.parentElement) {
    if(parent.tagName==='DETAILS') parent.open=true;
  }
  const row = target.closest('[data-reference]');
  if (row?.hidden) { referenceSearch.value = ''; filterReferences(); }
}
function currentTarget() { try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return null; } }
window.addEventListener('hashchange', () => revealReference(currentTarget()));
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  let id;
  try { id = decodeURIComponent(link.getAttribute('href').slice(1)); } catch { return; }
  const target = document.getElementById(id || 'top');
  if (!target) return;
  event.preventDefault();
  link.closest('dialog')?.close('navigate');
  revealReference(target);
  history.pushState(null, '', '#' + encodeURIComponent(id || 'top'));
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: root.classList.contains('reduce-motion') ? 'instant' : 'smooth', block: 'start' });
});

const observedHeadings = [...document.querySelectorAll('#article-content h2,#article-content h3,#article-content h4')];
let scrollQueued = false;
function updateScroll() {
  scrollQueued = false;
  let current = 'top';
  for (const heading of observedHeadings) {
    if (heading.getBoundingClientRect().top <= 100) current = heading.id; else break;
  }
  document.querySelectorAll('.toc-link').forEach(link => {
    if (link.getAttribute('href').slice(1) === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const range = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.width = `${range > 0 ? 100 * scrollY / range : 0}%`;
}
window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();
document.addEventListener('pointermove', event => {
  if (preferences['reading-guide'] && !document.querySelector('dialog[open]')) document.querySelector('.reading-guide-overlay').style.top = `${Math.max(0,event.clientY - 50)}px`;
}, { passive: true });
document.addEventListener('keydown', event => {
  if (!preferences['reading-guide'] || !event.altKey || !['ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const guide = document.querySelector('.reading-guide-overlay');
  const top = guide.getBoundingClientRect().top + (event.key === 'ArrowDown' ? 30 : -30);
  guide.style.top = `${Math.min(innerHeight - 100, Math.max(0, top))}px`;
});
document.querySelector('[for="setting-reading-guide"] small').textContent = 'Follow each line with the pointer or Alt + ↑ / ↓.';
document.querySelector('[data-print]').addEventListener('click', () => window.print());
document.querySelector('[data-permalink]').addEventListener('click', async event => {
  const button = event.currentTarget;
  try {
    const metadata = await fetch(new URL('source-metadata.json', assetBase)).then(r => r.json());
    await navigator.clipboard.writeText(`https://en.wikipedia.org/w/index.php?title=Jordan_Spieth&oldid=${metadata.revision}`);
    button.textContent = 'Permanent link copied'; announce('Permanent link copied to clipboard.');
  } catch { button.textContent = 'Copy unavailable — see source in footer'; announce('Clipboard unavailable. The permanent source link is in the article footer.'); }
});

// Scroll controls make wide tables usable without precision trackpad gestures.
const tableDialog=document.querySelector('#table-dialog');
let expandedTable=null;
function updateExpandedScroll() {
  if(!expandedTable)return;
  const scroll=expandedTable.scroll;
  const controls=tableDialog.querySelector('.expanded-scroll-controls');
  controls.hidden=scroll.scrollWidth<=scroll.clientWidth+2;
  controls.querySelector('[data-expanded-scroll="-1"]').disabled=scroll.scrollLeft<=1;
  controls.querySelector('[data-expanded-scroll="1"]').disabled=scroll.scrollLeft>=scroll.scrollWidth-scroll.clientWidth-2;
}
tableDialog.querySelectorAll('[data-expanded-scroll]').forEach(button=>button.addEventListener('click',()=>{
  expandedTable?.scroll.scrollBy({left:Number(button.dataset.expandedScroll)*Math.max(180,expandedTable.scroll.clientWidth*.7),behavior:root.classList.contains('reduce-motion')?'instant':'smooth'});
}));
const tableObservers=[];
document.querySelectorAll('.data-table-card').forEach(card=>{
  const scroll=card.querySelector('.article-table-scroll');
  const controls=card.querySelector('.table-scroll-actions');
  const buttons=[...card.querySelectorAll('[data-table-scroll]')];
  const update=()=>{
    const overflow=scroll.scrollWidth>scroll.clientWidth+2;
    controls.hidden=!overflow;
    card.querySelector('[data-table-hint]').hidden=!overflow && scroll.scrollHeight<=scroll.clientHeight+2;
    buttons[0].disabled=scroll.scrollLeft<=1;
    buttons[1].disabled=scroll.scrollLeft>=scroll.scrollWidth-scroll.clientWidth-2;
    if(expandedTable?.scroll===scroll)updateExpandedScroll();
  };
  buttons.forEach(button=>button.addEventListener('click',()=>scroll.scrollBy({left:Number(button.dataset.tableScroll)*Math.max(180,scroll.clientWidth*.7),behavior:root.classList.contains('reduce-motion')?'instant':'smooth'})));
  scroll.addEventListener('scroll',update,{passive:true});
  const observer=new ResizeObserver(update);observer.observe(scroll);tableObservers.push(observer);update();
});
document.querySelectorAll('[data-table-expand]').forEach(button=>button.addEventListener('click',()=>{
  const scroll=document.getElementById(button.dataset.tableExpand);
  const card=scroll.closest('.data-table-card');
  expandedTable={scroll,card};
  dialogTrigger=button;
  document.querySelector('#table-dialog-title').textContent=scroll.querySelector('table').getAttribute('aria-label');
  const holder=document.querySelector('.table-dialog-content');
  holder.classList.add('data-table-card');
  holder.append(scroll);
  tableDialog.returnValue='';tableDialog.showModal();document.body.style.overflow='hidden';
  updateExpandedScroll();
  scroll.focus();
}));
tableDialog.addEventListener('close',()=>{
  if(expandedTable){expandedTable.card.querySelector('.table-overflow-hint').before(expandedTable.scroll);expandedTable=null;}
});
// Printing includes every related group, even those collapsed on screen.
let printDisclosureState=[];
window.addEventListener('beforeprint',()=>{
  printDisclosureState=[...document.querySelectorAll('.related-card')].map(details=>[details,details.open]);
  printDisclosureState.forEach(([details])=>{details.open=true;});
});
window.addEventListener('afterprint',()=>{printDisclosureState.forEach(([details,open])=>{details.open=open;});});

const readButton = document.querySelector('#read-aloud');
const pauseButton = document.querySelector('#pause-reading');
const stopButton = document.querySelector('#stop-reading');
const readingStatus = document.querySelector('#reading-status');
let speechParts = [], speechIndex = 0, speechRun = 0, paused = false;
function stopReading() {
  speechRun++;
  window.speechSynthesis?.cancel();
  readButton.disabled = false; pauseButton.disabled = true; stopButton.disabled = true;
  pauseButton.lastChild.textContent = 'Pause'; paused = false;
  readingStatus.textContent = 'Reading stopped.';
}
function speakPart(run) {
  if (run !== speechRun) return;
  if (speechIndex >= speechParts.length) { stopReading(); readingStatus.textContent = 'Finished reading the article.'; return; }
  const utterance = new SpeechSynthesisUtterance(speechParts[speechIndex]);
  utterance.lang = 'en-US'; utterance.rate = 0.95;
  utterance.onend = () => { if (run === speechRun) { speechIndex++; speakPart(run); } };
  utterance.onerror = event => { if (run === speechRun && event.error !== 'interrupted' && event.error !== 'canceled') { stopReading(); readingStatus.textContent = 'Speech is unavailable. Check your device’s installed voices.'; } };
  speechSynthesis.speak(utterance);
  readingStatus.textContent = `Reading passage ${speechIndex + 1} of ${speechParts.length}.`;
}
if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
  readButton.addEventListener('click', () => {
    stopReading();
    const textNodes = [...document.querySelectorAll('#article-content p,#article-content h2,#article-content h3,#article-content h4')].filter(el => !el.closest('.infobox,.navbox,.reflist,.references-table') && el.textContent.trim());
    speechParts = textNodes.flatMap(el => {
      const clone = el.cloneNode(true); clone.querySelectorAll('sup.reference,.mw-editsection').forEach(node => node.remove());
      return clone.textContent.trim().match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clone.textContent.trim()];
    });
    speechIndex = 0; readButton.disabled = true; pauseButton.disabled = false; stopButton.disabled = false;
    speakPart(speechRun);
  });
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (paused) speechSynthesis.pause(); else speechSynthesis.resume();
    pauseButton.lastChild.textContent = paused ? 'Resume' : 'Pause';
    readingStatus.textContent = paused ? 'Reading paused.' : `Reading passage ${speechIndex + 1} of ${speechParts.length}.`;
  });
  stopButton.addEventListener('click', stopReading);
  window.addEventListener('pagehide', () => speechSynthesis.cancel());
} else {
  readButton.disabled = true;
  readingStatus.textContent = 'Read aloud is not supported in this browser. You can use your device’s screen reader.';
}
if (location.hash) { const target = currentTarget(); revealReference(target); if(target) requestAnimationFrame(() => target.scrollIntoView()); }

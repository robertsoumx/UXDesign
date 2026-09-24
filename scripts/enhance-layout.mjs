// Presentation-only improvements; article prose, data, and media stay intact.
export function enhanceLayout(document, icon) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = './refinements.css';
  document.head.append(stylesheet);
  const article = document.querySelector('#article-content');
  const overview = document.querySelector('.toc-footer');
  const overviewButton = document.createElement('button');
  overviewButton.className = 'button sidebar-action toc-overview';
  overviewButton.setAttribute('data-open', 'contents-dialog');
  overviewButton.innerHTML = `${icon('list')}<span>On this page</span>${icon('right')}`;
  overview.replaceWith(overviewButton);
  document.querySelectorAll('.back-to-top,.appearance-reset,.hide-button').forEach(el => el.classList.add('button'));

  let tableIndex = 0;
  for (const scroll of article.querySelectorAll('.article-table-scroll')) {
    const table = scroll.querySelector('.wikitable');
    const firstRow = table.querySelector('tr');
    const isLegend = firstRow?.children.length === 1;
    if (isLegend) { scroll.classList.add('table-legend'); continue; }
    const sectionTitle = table.closest('section')?.querySelector('h2,h3,h4')?.textContent || 'Results';
    const previous = scroll.previousElementSibling;
    const title = previous?.tagName === 'P' && previous.textContent.includes('record') ? previous.textContent.trim() : sectionTitle;
    const id = `data-table-${++tableIndex}`;
    table.style.minWidth = firstRow.children.length >= 10 ? '1200px' : firstRow.children.length >= 6 ? '820px' : '600px';
    scroll.id = id;
    table.setAttribute('aria-label', title);
    const card = document.createElement('div');
    card.className = 'data-table-card';
    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';
    toolbar.innerHTML = `<div class="table-heading"><span class="table-eyebrow">AT A GLANCE</span><strong>${escape(title)}</strong></div><div class="table-actions"><div class="table-scroll-actions" hidden><button class="button table-scroll-button" data-table-scroll="-1" aria-controls="${id}" aria-label="Scroll ${escape(title)} table left">${icon('right','point-left')}</button><button class="button table-scroll-button" data-table-scroll="1" aria-controls="${id}" aria-label="Scroll ${escape(title)} table right">${icon('right')}</button></div><button class="button table-expand" data-table-expand="${id}" aria-haspopup="dialog">${icon('wide')}<span>Expand table</span></button></div>`;
    scroll.replaceWith(card);
    card.append(toolbar, scroll);
    // Expose real column and row headers to assistive technology.
    const thead = document.createElement('thead');
    const rows = [...table.querySelectorAll(':scope > tbody > tr,:scope > tr')];
    for (const row of rows) {
      if (![...row.children].every(cell => cell.tagName === 'TH')) break;
      for (const cell of row.children) cell.setAttribute('scope', 'col');
      thead.append(row);
    }
    if (thead.children.length) table.prepend(thead);
    for (const row of table.querySelectorAll('tbody > tr')) {
      const first = row.firstElementChild;
      if (!first || first.hasAttribute('colspan')) continue;
      if (first.tagName === 'TD') {
        const th = document.createElement('th');
        for (const attr of [...first.attributes]) th.setAttribute(attr.name, attr.value);
        while (first.firstChild) th.append(first.firstChild);
        first.replaceWith(th);
      }
      row.firstElementChild.setAttribute('scope', 'row');
    }
    const tableFooter=document.createElement('div');
    tableFooter.className='table-overflow-hint';
    tableFooter.innerHTML=`<span>${table.querySelectorAll('tbody > tr').length} rows · ${firstRow.children.length} columns</span><span data-table-hint hidden>${icon('down')}Scroll to explore the full table</span>`;
    card.append(tableFooter);
  }

  // Native disclosures remain usable with JavaScript disabled. Convert only the
  // layout tables inside the navigation boxes, never the article's data tables.
  const topNavboxes = [...article.querySelectorAll('.navbox')].filter(el => !el.parentElement.closest('.navbox'));
  for (const [index, navbox] of topNavboxes.entries()) {
    const labelledBy = navbox.getAttribute('aria-labelledby');
    const titleNode = labelledBy ? document.getElementById(labelledBy) : navbox.querySelector('.navbox-title');
    const title = titleNode?.textContent.trim() || 'Related articles';
    const linkCount = [...navbox.querySelectorAll('a')].filter(a => !a.closest('.navbar')).length;
    const details = document.createElement('details');
    details.className = 'related-card';
    details.id = `related-group-${index + 1}`;
    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="related-icon">${icon('book')}</span><span class="related-summary-title">${escape(title)}</span><span class="related-meta">${linkCount} links</span>${icon('down')}`;
    navbox.replaceWith(details);
    details.append(summary, navbox);
    navbox.classList.add('related-content');
  }
  for (const table of [...article.querySelectorAll('.navbox table')].reverse()) {
    for (const node of [...table.querySelectorAll('thead,tbody,tr,th,td')].reverse()) {
      if (node.closest('table') !== table) continue;
      const block = document.createElement('div');
      for (const attr of [...node.attributes]) if (!['colspan','rowspan','scope'].includes(attr.name)) block.setAttribute(attr.name, attr.value);
      block.classList.add(`related-${node.tagName.toLowerCase()}`);
      while (node.firstChild) block.append(node.firstChild);
      node.replaceWith(block);
    }
    const block = document.createElement('div');
    for (const attr of [...table.attributes]) block.setAttribute(attr.name, attr.value);
    block.classList.add('related-layout');
    while (table.firstChild) block.append(table.firstChild);
    table.replaceWith(block);
  }
  for (const a of article.querySelectorAll('.navbox .navbar a')) {
    const abbreviation = a.querySelector('abbr');
    if (abbreviation) {
      a.setAttribute('aria-label', abbreviation.title);
      abbreviation.textContent = ({v:'View',t:'Talk',e:'Edit'})[abbreviation.textContent] || abbreviation.textContent;
    }
  }
  for (const a of article.querySelectorAll('.navbox a')) if (!a.hasAttribute('href')) a.setAttribute('aria-current', 'page');
  for (const li of article.querySelectorAll('.navbox li')) {
    if(!li.closest('.navbar') && li.querySelectorAll('a[href]').length===1) li.classList.add('single-link-card');
  }
  const external = article.querySelector('#External_links')?.closest('section');
  external?.classList.add('external-section');
  for (const list of external?.querySelectorAll(':scope > ul') || []) list.classList.add('external-resource-list');

  const tableDialog = document.createElement('dialog');
  tableDialog.className = 'table-dialog';
  tableDialog.id = 'table-dialog';
  tableDialog.setAttribute('aria-labelledby','table-dialog-title');
  tableDialog.innerHTML = `<div class="dialog-header"><h2 id="table-dialog-title">Results table</h2><button class="button" data-close aria-label="Close expanded table">${icon('close')}<span>Close table</span></button></div><div class="table-dialog-content"></div><div class="table-dialog-hint"><span>Scroll to explore every column. Use the arrow keys when the table is focused.</span><div class="expanded-scroll-controls"><button class="button" data-expanded-scroll="-1" aria-label="Scroll expanded table left">${icon('right','point-left')}<span>Left</span></button><button class="button" data-expanded-scroll="1" aria-label="Scroll expanded table right"><span>Right</span>${icon('right')}</button></div></div>`;
  document.body.append(tableDialog);
}

function escape(value) {
  return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

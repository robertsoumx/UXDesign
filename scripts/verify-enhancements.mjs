import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
let server;
try {
  const context=await browser.newContext({viewport:{width:1512,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'On this page',exact:true}).click();
  assert.equal(await page.locator('#contents-dialog').isVisible(),true);
  await page.keyboard.press('Escape');
  const undersized=await page.locator('.appearance-reset:visible,.back-to-top:visible,.toc-overview:visible,.hide-button:visible,.toc-link:visible').evaluateAll(elements=>elements.map(el=>({text:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})).filter(box=>box.width<44||box.height<44));
  assert.deepEqual(undersized,[]);
  const firstCard=page.locator('.data-table-card').first();
  await firstCard.scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/data-tables.png'});
  const scroller=firstCard.locator('.article-table-scroll');
  const tableId=await scroller.getAttribute('id');
  const tableText=await scroller.innerText();
  const right=firstCard.locator('[data-table-scroll="1"]');
  if(await right.isVisible()) {
    await right.click();
    assert.ok(await scroller.evaluate(el=>el.scrollLeft)>0);
  }
  await firstCard.locator('[data-table-expand]').click();
  assert.equal(await page.locator('#table-dialog').isVisible(),true);
  assert.equal(await page.locator(`#table-dialog #${tableId}`).innerText(),tableText);
  assert.equal(await page.locator(`#table-dialog #${tableId}`).evaluate(el=>el===document.activeElement),true);
  await page.screenshot({path:'test-results/expanded-table.png'});
  const tableAudit=await new AxeBuilder({page}).include('#table-dialog').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  assert.equal(tableAudit.violations.length,0,'Expanded table dialog must pass automated accessibility checks.');
  await page.keyboard.press('Escape');
  await page.waitForFunction(id=>document.querySelector(`.data-table-card > #${id}`)!==null,tableId);
  assert.equal(await firstCard.locator('[data-table-expand]').evaluate(el=>el===document.activeElement),true);
  console.log('Prominent buttons, contents overview, table scrolling, expansion, and focus restoration passed.');

  await page.locator('#External_links').scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/external-links.png'});
  const cards=page.locator('.related-card');
  assert.equal(await cards.count(),9);
  await cards.first().locator('summary').click();
  assert.equal(await cards.first().getAttribute('open'),'');
  await cards.first().evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:'test-results/related-links.png'});
  // Open every disclosure so automated checks cover content hidden by default.
  await cards.evaluateAll(elements=>elements.forEach(el=>el.open=true));
  const result=await new AxeBuilder({page}).include('#article-content').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  await writeFile('test-results/axe-expanded-content.json',JSON.stringify(result.violations,null,2));
  console.log('Expanded-content accessibility:',JSON.stringify(result.violations.map(v=>({id:v.id,count:v.nodes.length,examples:v.nodes.slice(0,3).map(n=>({target:n.target,summary:n.failureSummary}))}))));
  assert.equal(result.violations.length,0);
  const tinyLinks=await page.locator('.related-card a[href]').evaluateAll(links=>links.filter(a=>a.getBoundingClientRect().width<44||a.getBoundingClientRect().height<44).map(a=>a.textContent));
  assert.deepEqual(tinyLinks,[],'Related links must have minimum 44px targets.');
  await page.setViewportSize({width:390,height:900});
  await page.locator('.related-card').first().scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'test-results/related-links-mobile.png'});
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.locator('[data-table-expand]').click();
  const expandedScroll=page.locator('#table-dialog .article-table-scroll');
  const scrollBefore=await expandedScroll.evaluate(el=>el.scrollLeft);
  await page.getByRole('button',{name:'Scroll expanded table right',exact:true}).click();
  assert.ok(await expandedScroll.evaluate(el=>el.scrollLeft)>scrollBefore);
  await page.getByRole('button',{name:'Scroll expanded table left',exact:true}).click();
  await page.screenshot({path:'test-results/expanded-table-mobile.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.keyboard.press('Escape');
  console.log('Related navigation and mobile expanded tables passed.');
  await page.setViewportSize({width:320,height:900});
  await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow at 320px.');
  await page.screenshot({path:'test-results/viewport-320.png'});
  console.log('320px layout passed without horizontal page overflow.');

  // Exercise both supported Pages publishing configurations at real subpath URLs.
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
  server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      const match=url.pathname.match(/^\/(artifact|branch)\/UXDesign\/(.*)$/);
      if(!match)throw new Error('Unknown route');
      const relative=decodeURIComponent(match[2]||'index.html');
      const base=path.resolve(match[1]==='artifact'?'public':'.');
      const file=path.resolve(base,relative);
      if(!file.startsWith(base+path.sep)||relative.includes('..')||(match[1]==='branch'&&relative!=='index.html'&&!relative.startsWith('public/')))throw new Error('Disallowed path');
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
      res.end(await readFile(file));
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  for(const mode of ['artifact','branch']) {
    const failures=[];
    const appErrors=[];
    const tab=await context.newPage();
    tab.on('response',response=>{if(response.status()>=400)failures.push(response.url());});
    tab.on('pageerror',error=>appErrors.push(error.message));
    await tab.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}}));
    await tab.goto(`http://127.0.0.1:${port}/${mode}/UXDesign/`,{waitUntil:'networkidle'});
    await tab.locator('img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
    await tab.waitForFunction(()=>[...document.images].every(img=>img.complete));
    assert.equal(await tab.locator('img').evaluateAll(images=>images.filter(img=>!img.naturalWidth).length),0);
    assert.equal(await tab.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(245, 247, 251)');
    await tab.locator('.appearance-sidebar input[value="large"]').check();
    assert.equal(await tab.locator('html').getAttribute('data-size'),'large');
    await tab.locator('.tools-menu summary').click();
    await tab.locator('[data-permalink]').click();
    await tab.getByRole('button',{name:'Permanent link copied',exact:true}).waitFor();
    assert.deepEqual(failures,[],`${mode} must have no missing assets.`);
    assert.deepEqual(appErrors,[]);
    await tab.close();
    console.log(`GitHub Pages ${mode} mode passed at /UXDesign/: CSS, scripts, all images, preferences, and metadata fetch.`);
  }
} catch(error) {console.error(error.message);throw error;}
finally {if(server)await new Promise(resolve=>server.close(resolve));await browser.close();}

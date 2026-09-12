/// <reference lib="dom" />
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('.impeccable/review/hub-final');
mkdirSync(output,{recursive:true});
const axe = readFileSync(resolve('node_modules/axe-core/axe.min.js'), 'utf8');
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { first_name: 'Nexus', last_name: 'Preview' }, created_at: '2026-01-01T00:00:00Z', factors: [] };
const session = { user, access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 };

test.beforeEach(async ({ context }) => {
  await context.addInitScript(value => {
    localStorage.setItem('sb-nexus-auth-test-auth-token', JSON.stringify(value));
  }, session);
  await context.route('https://nexus-auth-test.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(path === '/auth/v1/user' ? user : []) });
  });
});

for (const width of [320,390,768,1280,1920]) {
  test(`layout and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/projects/index.html');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.hero-image')).toBeVisible();
    expect(await page.evaluate(() => innerWidth)).toBe(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('heading', {name:'Nexus Main',exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Main',exact:true})).toHaveAttribute('href','/dashboard');
    await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Tools',exact:true})).toHaveAttribute('href','https://nexus-tools-chi.vercel.app/');
    const undersized = await page.locator('a,button').evaluateAll(els => els.filter(e => {
      const r=e.getBoundingClientRect(); const s=getComputedStyle(e);
      return r.width>0 && r.height>0 && s.display!=='none' && (r.height<44 || r.width<44);
    }).map(e => e.textContent));
    expect(undersized).toEqual([]);
    await page.addScriptTag({content:axe});
    const results = await page.evaluate(async () => await (window as any).axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}}));
    writeFileSync(`${output}/axe-${width}.json`,JSON.stringify({violations:results.violations,incomplete:results.incomplete.map((r:any)=>({id:r.id,nodes:r.nodes.map((n:any)=>n.target)})),passes:results.passes.map((r:any)=>r.id)},null,2));
    expect(results.violations.map((r:any)=>({id:r.id,nodes:r.nodes.map((n:any)=>n.target)}))).toEqual([]);
    await page.screenshot({path:`${output}/${width}.png`,fullPage:true,animations:'disabled'});
  });
}

test('workspace arrival is static with or without reduced motion', async ({page}) => {
  await page.goto('/projects/index.html');
  await expect(page.locator('#hero-title')).toBeVisible();
  await expect(page.locator('#motion-toggle')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Main',exact:true})).toBeVisible();
});

test('keyboard skip link, focus contrast and section navigation', async ({page}) => {
  await page.goto('/projects/index.html');
  await expect(page.locator('.hero-image')).toBeVisible();
  await expect(page.getByRole('button',{name:'เมนูบัญชี Nexus Preview'})).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#projects')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Main',exact:true})).toBeFocused();
  expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineStyle)).toBe('solid');
  await page.getByRole('link',{name:'เกี่ยวกับ Nexus'}).click();
  await expect(page).toHaveURL(/#about$/);
});

test('200% text scaling at phone width and forced colors',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/projects/index.html');
  await page.evaluate(() => { const sizes = [...document.querySelectorAll<HTMLElement>('body *')].map(el => ({el,size:parseFloat(getComputedStyle(el).fontSize)})); sizes.forEach(({el,size})=>el.style.fontSize = (size*2)+'px'); });
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:`${output}/text-200.png`,fullPage:true,animations:'disabled'});
  await page.emulateMedia({forcedColors:'active'});
  await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Main',exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/forced-colors.png`,fullPage:true,animations:'disabled'});
});

test('disabled JavaScript never reveals the authenticated hub',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.route('**/assets/hero*.webp',r=>r.abort());
  await page.goto('/projects/index.html');
  await expect(page.locator('#motion-toggle')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'เข้าสู่ Nexus Main',exact:true})).toHaveCount(0);
  await page.screenshot({path:`${output}/fallback.png`,fullPage:true});
  await context.close();
});

test('bounded local resource budget and no page errors',async({page})=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/projects/index.html');
  await page.evaluate(()=>document.fonts.ready);
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,bytes:(e as PerformanceResourceTiming).decodedBodySize})));
  writeFileSync(`${output}/resources.json`,JSON.stringify(resources,null,2));
  expect(errors).toEqual([]);
  expect(resources.filter(r=>new URL(r.name).origin!==new URL(page.url()).origin)).toEqual([]);
  const assetBytes=resources.filter(r=>r.name.includes('/projects/')).reduce((n,r)=>n+r.bytes,0);
  expect(assetBytes).toBeLessThan(200000);
});



test('capture background evidence for text over hero image',async({page})=>{
  for(const width of [320,390,768,1280,1920]){
    await page.setViewportSize({width,height:900});
    await page.goto('/projects/index.html');
    await expect(page.locator('#hero-title')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const selectors=['#hero-title','#hero-title em','.hero-content > p'];
    const boxes=await page.evaluate(selectors=>selectors.map(selector=>{
      const el=document.querySelector(selector)!; const range=document.createRange(); range.selectNodeContents(el); const r=range.getBoundingClientRect();
      return {selector,x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,color:getComputedStyle(el).color};
    }),selectors);
    await page.addStyleTag({content:'#hero-title,#hero-title em,.hero-content>p{color:transparent!important}'});
    writeFileSync(`${output}/contrast-${width}.json`,JSON.stringify(boxes));
    await page.screenshot({path:`${output}/contrast-${width}.png`,fullPage:true});
  }
});



test('resized desktop and phone contrast evidence',async({page})=>{
  for(const width of [390,1280]){
    await page.setViewportSize({width,height:900});
    await page.goto('/projects/index.html');
    await expect(page.locator('#hero-title')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(() => { const sizes = [...document.querySelectorAll<HTMLElement>('body *')].map(el => ({el,size:parseFloat(getComputedStyle(el).fontSize)})); sizes.forEach(({el,size})=>el.style.fontSize = (size*2)+'px'); });
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:`${output}/text-200-${width}.png`,fullPage:true});
    const selectors=['#hero-title','#hero-title em','.hero-content > p'];
    const boxes=await page.evaluate(selectors=>selectors.map(selector=>{
      const el=document.querySelector(selector)!; const range=document.createRange(); range.selectNodeContents(el); const r=range.getBoundingClientRect();
      return {selector,x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,color:getComputedStyle(el).color};
    }),selectors);
    await page.addStyleTag({content:'#hero-title,#hero-title em,.hero-content>p{color:transparent!important}'});
    writeFileSync(`${output}/contrast-zoom-${width}.json`,JSON.stringify(boxes));
    await page.screenshot({path:`${output}/contrast-zoom-${width}.png`,fullPage:true});
  }
});




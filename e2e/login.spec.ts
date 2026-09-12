import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const output='.impeccable/review/login';
mkdirSync(output,{recursive:true});
for(const width of [320,390,768,1280]) test(`login and signup ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/projects');
 await expect(page.locator('.login-form')).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await page.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')});
 for(const mode of ['signIn','signUp']){
  await page.locator(`#login-tab-${mode}`).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const violations=await page.evaluate(async()=> (await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);
  expect(violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}))).toEqual([]);
  await page.screenshot({path:`${output}/${mode}-${width}.png`,fullPage:true});
 }
});

test('validation border feedback',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto('/projects');
 const email=page.locator('#login-email');
 await email.fill('incorrect'); await email.blur();
 await expect(email).toHaveClass(/is-invalid/);
 await page.screenshot({path:`${output}/invalid-390.png`,fullPage:true});
 await email.fill('preview@example.com'); await email.blur();
 await expect(email).toHaveClass(/is-valid/);
 await page.screenshot({path:`${output}/valid-390.png`,fullPage:true});
});


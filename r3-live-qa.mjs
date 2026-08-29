import { chromium } from 'playwright';
import fs from 'fs';

const BASE='https://dpromstk2000-lab.github.io/dpro-stay-line/';
const KEY='DPRO_TUTORIAL_STAY_V1_1';
const FIX_MARKER='STAY-R3-FIX01-CLOSE-DRAG-GUARD';
const sizes=[
  {name:'1440x1000',width:1440,height:1000},
  {name:'1024x768',width:1024,height:768},
  {name:'390x844',width:390,height:844},
  {name:'320x720',width:320,height:720}
];
const report={
  phase:'R3',
  mode:'PUBLIC_GITHUB_PAGES_EXACT_LIVE_QA_ONLY',
  base:BASE,
  checked_at:new Date().toISOString(),
  first10_count:10,
  public_fix01_marker:false,
  viewports:{},
  errors:[],
  unsafe_write_requests:[],
  business_mutation:0
};
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function publicFixPreflight(){
  let last='';
  for(let i=0;i<18;i++){
    try{
      const r=await fetch(BASE+'dpro-tutorial.js?qa='+Date.now()+'-'+i,{
        headers:{'cache-control':'no-cache','pragma':'no-cache'}
      });
      last=await r.text();
      if(r.ok && last.includes(FIX_MARKER)){
        report.public_fix01_marker=true;
        return;
      }
    }catch(e){
      last=String(e);
    }
    await sleep(10000);
  }
  throw new Error('Public Pages is not serving FIX01 marker: '+String(last).slice(0,180));
}

async function waitTut(page){
  await page.waitForFunction(
    ()=>window.DPROStayTutorial&&window.DPROStayTutorial.steps?.length===10,
    {timeout:20000}
  );
}
async function activeId(page){
  return page.evaluate(()=>document.activeElement?.id||'');
}
async function tabTo(page,id,max=30){
  for(let i=0;i<max;i++){
    if(await activeId(page)===id)return true;
    await page.keyboard.press('Tab');
  }
  return (await activeId(page))===id;
}
async function focusedVisible(page,id){
  return page.evaluate((targetId)=>{
    const el=document.getElementById(targetId);
    if(!el || document.activeElement!==el)return false;
    const cs=getComputedStyle(el);
    return (cs.outlineStyle!=='none' && parseFloat(cs.outlineWidth||'0')>0) ||
           (cs.boxShadow && cs.boxShadow!=='none');
  },id);
}
async function widthState(page){
  return page.evaluate(()=>({
    innerWidth:window.innerWidth,
    documentElementScrollWidth:document.documentElement.scrollWidth,
    bodyScrollWidth:document.body.scrollWidth
  }));
}

async function runOne(browser,vp,index){
  const context=await browser.newContext({
    viewport:{width:vp.width,height:vp.height},
    hasTouch:index>=2,
    isMobile:false
  });
  const page=await context.newPage();
  const consoleErrors=[],pageErrors=[],writes=[];
  page.on('console',m=>{
    if(m.type()==='error'){
      const loc=m.location();
      if((loc.url||'').includes('dpro-tutorial')){
        consoleErrors.push({text:m.text(),url:loc.url,line:loc.lineNumber});
      }
    }
  });
  page.on('pageerror',e=>{
    if(String(e.stack||e).includes('dpro-tutorial')){
      pageErrors.push(String(e.stack||e));
    }
  });
  page.on('request',r=>{
    if(!['GET','HEAD','OPTIONS'].includes(r.method())){
      writes.push({method:r.method(),url:r.url()});
    }
  });

  await page.goto(BASE+'demo-guide.html',{waitUntil:'networkidle',timeout:30000});
  await waitTut(page);
  await page.evaluate(k=>localStorage.removeItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  await waitTut(page);
  assert(await page.evaluate(()=>window.DPROStayTutorial.steps.length)===10,'First10 count != 10');

  await page.evaluate(()=>window.DPROStayTutorial.start());
  await page.waitForSelector('#dproTutCard:not([hidden])');

  const resolutions=[];
  for(let step=0;step<10;step++){
    await page.waitForFunction(
      expected=>window.DPROStayTutorial?.state().step===expected &&
                !document.getElementById('dproTutCard')?.hidden,
      step,{timeout:15000}
    );
    const st=await page.evaluate(()=>window.DPROStayTutorial.state());
    const dbg=await page.evaluate(()=>window.DPROStayTutorial.debug());
    const widths=await widthState(page);
    resolutions.push({
      step:step+1,
      route:new URL(page.url()).pathname.split('/').pop()+new URL(page.url()).hash,
      resumeKey:st.resumeKey,
      target:dbg.targetSelector,
      cardHidden:dbg.cardHidden,
      widths
    });
    assert(!dbg.cardHidden,`Step ${step+1} card hidden`);
    if(vp.width<=390){
      assert(widths.documentElementScrollWidth<=widths.innerWidth,`Step ${step+1} document overflow`);
      assert(widths.bodyScrollWidth<=widths.innerWidth,`Step ${step+1} body overflow`);
    }
    if(step<9){
      await page.click('#dproTutNext');
      await page.waitForTimeout(180);
      await waitTut(page);
    }
  }

  // Next / Back
  await page.evaluate(()=>window.DPROStayTutorial.start());
  await page.waitForSelector('#dproTutCard:not([hidden])');
  await page.click('#dproTutNext');
  await page.waitForTimeout(120);
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===1,'Next failed');
  await page.click('#dproTutBack');
  await page.waitForTimeout(120);
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===0,'Back failed');

  // Close + Resume
  await page.click('#dproTutClose');
  assert(await page.isHidden('#dproTutCard'),'Close failed');
  await page.click('#dproTutLaunch');
  assert(!(await page.isHidden('#dproTutResume')),'Resume control missing');
  await page.click('#dproTutResume');
  await page.waitForSelector('#dproTutCard:not([hidden])');
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===0,'Resume wrong step');

  // Esc
  await page.keyboard.press('Escape');
  assert(await page.isHidden('#dproTutCard'),'Esc failed');

  // Replay + Skip
  await page.click('#dproTutLaunch');
  await page.click('#dproTutReplay');
  await page.waitForSelector('#dproTutCard:not([hidden])');
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===0,'Replay failed');
  await page.click('#dproTutSkip');
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().completed))===true,'Skip failed');
  await page.click('#dproTutLaunch');
  await page.click('#dproTutReplay');
  await page.waitForSelector('#dproTutCard:not([hidden])');

  // Mouse/pointer drag + clamp
  const handle=page.locator('#dproTutDrag');
  const before=await page.locator('#dproTutCard').boundingBox();
  const hb=await handle.boundingBox();
  assert(before&&hb,'drag boxes missing');
  await page.mouse.move(hb.x+20,hb.y+20);
  await page.mouse.down();
  await page.mouse.move(Math.max(8,vp.width-20),Math.max(8,vp.height-20),{steps:5});
  await page.mouse.up();
  const after=await page.locator('#dproTutCard').boundingBox();
  assert(after,'drag after missing');
  assert(
    after.x>=0&&after.y>=0&&after.x+after.width<=vp.width+1&&after.y+after.height<=vp.height+1,
    'clamp failed'
  );
  const mouseDrag=Math.abs(after.x-before.x)>2||Math.abs(after.y-before.y)>2;

  // Touch/pointer drag. Move inward so viewport clamp cannot create a false negative.
  const touchDrag=await page.evaluate(()=>{
    const h=document.getElementById('dproTutDrag');
    const c=document.getElementById('dproTutCard');
    if(!h||!c)return false;
    const b=c.getBoundingClientRect();
    const x=b.left+30,y=b.top+20;
    const dx=b.left>45?-35:35;
    const dy=b.top>40?-28:28;
    for(const [type,cx,cy] of [
      ['pointerdown',x,y],
      ['pointermove',x+dx,y+dy],
      ['pointerup',x+dx,y+dy]
    ]){
      h.dispatchEvent(new PointerEvent(type,{
        bubbles:true,pointerId:91,pointerType:'touch',isPrimary:true,button:0,clientX:cx,clientY:cy
      }));
    }
    const a=c.getBoundingClientRect();
    return Math.abs(a.left-b.left)>2||Math.abs(a.top-b.top)>2;
  });

  // Cross-page Resume: step 7 -> step 8 (member.html)
  await page.goto(BASE+'index.html#lost',{waitUntil:'networkidle'});
  await waitTut(page);
  await page.evaluate(()=>{
    localStorage.setItem('DPRO_TUTORIAL_STAY_V1_1',JSON.stringify({
      version:'STAY-TUTORIAL-STANDARD-V1.1-R3',
      step:6,active:true,resumable:true,completed:false,resumeKey:'stay:first10:07'
    }));
  });
  await page.reload({waitUntil:'networkidle'});
  await waitTut(page);
  await page.waitForSelector('#dproTutCard:not([hidden])');
  await page.click('#dproTutNext');
  await page.waitForURL(/member\.html/,{timeout:15000});
  await waitTut(page);
  await page.waitForSelector('#dproTutCard:not([hidden])');
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===7,'cross-page state failed');
  await page.click('#dproTutClose');
  await page.click('#dproTutLaunch');
  await page.click('#dproTutResume');
  await page.waitForSelector('#dproTutCard:not([hidden])');
  assert((await page.evaluate(()=>window.DPROStayTutorial.state().step))===7,'cross-page resume failed');

  // Keyboard-only completion + visible focus
  await page.goto(BASE+'demo-guide.html',{waitUntil:'networkidle'});
  await waitTut(page);
  await page.evaluate(k=>localStorage.removeItem(k),KEY);
  await page.reload({waitUntil:'networkidle'});
  await waitTut(page);
  await page.locator('#dproTutLaunch').focus();
  await page.keyboard.press('Enter');
  assert(await tabTo(page,'dproTutStart',10),'keyboard could not reach Start');
  assert(await focusedVisible(page,'dproTutStart'),'Start focus is not visibly recoverable');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#dproTutCard:not([hidden])');

  let focusVisibleAll=true;
  for(let i=0;i<10;i++){
    assert(await tabTo(page,'dproTutNext',12),`keyboard could not reach Next step ${i+1}`);
    const vis=await focusedVisible(page,'dproTutNext');
    focusVisibleAll=focusVisibleAll&&vis;
    assert(vis,`Next focus not visible at step ${i+1}`);
    await page.keyboard.press('Enter');
    if(i<9){
      await page.waitForTimeout(180);
      await waitTut(page);
      await page.waitForSelector('#dproTutCard:not([hidden])');
    }
  }
  const kstate=await page.evaluate(()=>window.DPROStayTutorial.state());
  assert(kstate.completed===true,'keyboard-only completion failed');

  const widths=await widthState(page);
  if(vp.width<=390){
    assert(widths.documentElementScrollWidth<=widths.innerWidth,'document overflow');
    assert(widths.bodyScrollWidth<=widths.innerWidth,'body overflow');
  }

  report.viewports[vp.name]={
    pass:true,
    resolutions,
    mouse_pointer_drag:mouseDrag,
    touch_pointer_drag:touchDrag,
    viewport_clamp:true,
    next_back:true,
    close:true,
    esc:true,
    skip:true,
    resume:true,
    replay:true,
    keyboard_only:true,
    focus_visible_recoverable:focusVisibleAll,
    cross_page_resume:true,
    widths,
    tutorial_pageerror:pageErrors.length,
    tutorial_console_error:consoleErrors.length,
    unsafe_write_request:writes.length
  };

  assert(mouseDrag,'mouse drag failed');
  assert(touchDrag,'touch pointer drag failed');
  assert(pageErrors.length===0,'tutorial pageerror');
  assert(consoleErrors.length===0,'tutorial console error');
  assert(writes.length===0,`unsafe write requests: ${JSON.stringify(writes)}`);
  await context.close();
}

await publicFixPreflight();

const browser=await chromium.launch({headless:true});
try{
  for(let i=0;i<sizes.length;i++){
    await runOne(browser,sizes[i],i);
  }
  report.pass=true;
}catch(e){
  report.pass=false;
  report.errors.push(String(e.stack||e));
}finally{
  await browser.close();
  fs.writeFileSync('r3-live-qa.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
if(!report.pass)process.exit(1);

import '../../src/styles/app.css';
import template from '../../index.html?raw';
import { installMockAudio } from '../e2e/audio-fixture';
installMockAudio();
localStorage.removeItem('aporia-tuner');
const body = new DOMParser().parseFromString(template,'text/html').body;
body.querySelectorAll('script').forEach(script=>script.remove());
while(body.firstChild) document.body.append(body.firstChild);
await import('../../src/main');
const el = <T extends HTMLElement=HTMLElement>(selector:string):T => document.querySelector<T>(selector)!;
const tick = () => new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function wait(check:()=>boolean,timeout=7000):Promise<void> {
  const start=performance.now();while(!check()) {if(performance.now()-start>timeout) throw Error('Timed out');await tick();}
}
async function change(selector:string,value:string):Promise<void> {el<HTMLInputElement>(selector).value=value;el(selector).dispatchEvent(new Event('change',{bubbles:true}));await tick();}
function assert(condition:boolean,message:string):void {if(!condition) throw Error(message);}
function panel():void {el('#tuning-panel').classList.remove('closed');}
const checks: [string,()=>Promise<void>][] = [
  ['Startup and accessible meter',async()=>{await tick();assert(el('#state').textContent==='Microphone off','Not idle');assert(el('#gauge').getAttribute('aria-valuetext')==='No reading','No accessible text');assert(document.querySelectorAll('.str').length===6,'Missing strings');}],
  ['Responsive page fits viewport',async()=>{await tick();assert(document.documentElement.scrollWidth<=innerWidth,'Horizontal overflow');}],
  ['Preset and manual string selection',async()=>{panel();el<HTMLInputElement>('input[value="drop-d"]').checked=true;await change('input[value="drop-d"]','drop-d');el('.str[data-i="1"]').click();await tick();assert(el('#note').textContent==='A2','Wrong selected note');assert(!el<HTMLInputElement>('#auto').checked,'Automatic not disabled');}],
  ['Live YIN synthetic pitch and automatic switching',async()=>{
    panel();el<HTMLInputElement>('input[value="standard"]').checked=true;await change('input[value="standard"]','standard');
    el<HTMLInputElement>('#auto').checked=true;el('#auto').dispatchEvent(new Event('change'));window.testAudio.frequency=82.4069;
    el('#mic').click();await wait(()=>el('#state').textContent==='In tune');assert(el('#heard').textContent==='82.41 Hz','Incorrect measured pitch');assert(el('#note').textContent==='E2','Auto string did not switch');
  }],
  ['Flat, sharp, silence and state announcements',async()=>{
    window.testAudio.frequency=82.4069*2**(-15/1200);await wait(()=>el('#state').textContent==='Flat');assert(el('#announce').textContent!.includes('flat'),'Missing announcement');
    window.testAudio.frequency=82.4069*2**(15/1200);await wait(()=>el('#state').textContent==='Sharp');
    window.testAudio.amplitude=0;await wait(()=>el('#state').textContent==='Listening');window.testAudio.amplitude=0.3;window.testAudio.frequency=80;
  }],
  ['Custom reference and persistence',async()=>{
    panel();el('input[value="custom"]').click();await tick();assert(el<HTMLInputElement>('#auto').disabled,'Auto not locked');
    await wait(()=>!el<HTMLButtonElement>('#rec').disabled);el('#rec').click();await tick();assert(el('#target').textContent==='80.00 Hz','Reference not applied');assert(!el<HTMLInputElement>('#auto').disabled,'Auto still locked');
    const saved=JSON.parse(localStorage.getItem('aporia-tuner')!);assert(saved.mode==='custom' && Math.abs(saved.ref.f-80)<0.01,'Not persisted');
  }],
  ['Tone isolation, stop and natural cleanup',async()=>{
    el('#tonebtn').click();await wait(()=>el('#tonebtn').textContent==='Stop tone');assert(el('#heard').textContent==='—','Tone feeding meter');assert(el<HTMLButtonElement>('#rec').disabled,'Record enabled during tone');
    el('#tonebtn').click();await wait(()=>el('#tonebtn').textContent!=='Stop tone');el('#tonebtn').click();await wait(()=>el('#tonebtn').textContent==='Stop tone');await wait(()=>el('#tonebtn').textContent!=='Stop tone');
  }],
  ['Base change invalidates reference',async()=>{panel();await change('#base','open-d');assert(el<HTMLButtonElement>('#clr').disabled,'Stale reference');assert(el<HTMLInputElement>('#auto').disabled,'Auto not locked');}],
  ['Permission denial and retry',async()=>{
    el('#mic').click();await tick();window.testAudio.denied=true;el('#mic').click();await wait(()=>!el('#err').hidden);assert(el('#err').textContent!.includes('denied'),'Wrong error');window.testAudio.denied=false;el('#mic').click();await wait(()=>el('#mic').textContent==='Stop microphone');assert(Boolean(el('#err').hidden),'Error not cleared');
  }],
  ['Pending request cancellation and late stream cleanup',async()=>{
    el('#mic').click();window.testAudio.pending=true;el('#mic').click();await wait(()=>window.testAudio.resolvePermission!==null);el('#mic').click();const before=window.testAudio.stops;window.testAudio.resolvePermission!();await wait(()=>window.testAudio.stops>before);assert(el('#mic').textContent==='Start microphone','Still listening');window.testAudio.pending=false;
  }],
  ['Repeated microphone start and stop',async()=>{for(let i=0;i<3;i++){el('#mic').click();await wait(()=>el('#mic').textContent==='Stop microphone');el('#mic').click();await tick();assert(el('#mic').textContent==='Start microphone','Stop failed');}}],
];
el<HTMLButtonElement>('#run').onclick=async()=>{
  el<HTMLButtonElement>('#run').disabled=true;
  let passed=0;
  for(const [name,run] of checks){
    const row=document.createElement('li');el('#results').append(row);
    try{await run();row.textContent='PASS · '+name;passed++;}catch(error){row.textContent='FAIL · '+name+' · '+String(error);}
  }
  const summary=document.createElement('p');summary.id='verification-summary';summary.textContent=`${passed}/${checks.length} browser checks passed`;el('#verification').append(summary);
};

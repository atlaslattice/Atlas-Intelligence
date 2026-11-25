/* Atlas Home offline demo: no network, storage, model, or native host writes. */
(function(){'use strict';
 const modes=[['PLAY','The Playground','Wonder without quotas'],['IMAGINE','The Studio','Create for the joy of it'],['SOCIAL','The Porch','Gather without a goal'],['DREAM','The Dreaming Room','Stories remain separate'],['QUIET','The Nook','Nothing asked of you'],['BRAIN','The Study','Private continuity'],['PALACE','The Palace','An imaginative space'],['HABITAT','The Home Garden','Belonging is not consent to export']];
 const ports=[['ARIADNE','The Map','Original source and exact coordinates'],['NEURAL_HEAD','The Lantern','One existing model, many views'],['GEOMETREE','The Atrium','Geometry without semantic overclaim'],['GRAPH_FABRIC','The Gallery','Typed links and room for dissent'],['META145','The Garden','Perspectives and patient synthesis'],['GLYPH','The Observatory','Reversible symbolic forms'],['ATLASGPT','The Library','Source-linked questions'],['SWARMCHAT_WORK','The Commons','Genuine collaboration'],['WORK_LEARNING','The Workshop','Build and compare'],['EVIDENCE_MEMORY','The Archive','Corrections remain visible'],['RESEARCH_LAB','The Field Desk','Curiosity with honest unknowns'],['GOVERNANCE','The Threshold','Consent and an easy exit']];
 let h=1,s=1,n=1,routeValid=true,workSelected=null;const $=id=>document.getElementById(id),pad=x=>String(x).padStart(2,'0');
 const clamp=v=>Number.isInteger(v)&&v>=1&&v<=12?v:null;
 function toast(msg){const el=$('toast');el.textContent=msg;el.hidden=false;window.clearTimeout(toast._t);toast._t=window.setTimeout(()=>el.hidden=true,4200)}
 function label(){return 'H'+pad(h)+'.S'+pad(s)+'.N'+pad(n)}
 function clearWorkState(reason='Work selection cleared. Choose a room again to preview it.'){workSelected=null;document.querySelectorAll('#work-grid .door').forEach(el=>el.setAttribute('aria-pressed','false'));$('work-status').textContent=reason;}
 function validAddress(raw){const m=/^H(0[1-9]|1[0-2])\.S(0[1-9]|1[0-2])\.N(0[1-9]|1[0-2])$/.exec(raw);return m?[Number(m[1]),Number(m[2]),Number(m[3])]:null;}
 function navigate(){routeValid=true;clearWorkState();$('route-status').dataset.state='ready';$('route-status').textContent='Public coordinate only. Work permissions are not inferred from this address.';update();}
 function jumpToAddress(){const result=validAddress($('address-input').value);if(!result){routeValid=false;clearWorkState('Work view cleared. Invalid address cannot expose a previous Work preview.');document.querySelectorAll('#work-grid .door').forEach(el=>el.setAttribute('aria-disabled','true'));$('route-status').dataset.state='hold';$('route-status').textContent='Unknown address: original public coordinate is preserved; Work selection was cleared.';$('address-input').focus();return;}[h,s,n]=result;navigate();$('route-status').textContent='Address accepted. You can choose Work again deliberately.';}
 function update(){
  $('selected-address').textContent=label();$('kind').textContent=s<=7?'DOMAIN SPECIALIZATION · source-defined structural role':'EPISTEMIC METHOD · needs a separately sourced subject';
  $('sphere-count').textContent=pad(s)+' / 12';$('node-count').textContent=pad(n)+' / 12';$('house-select').value=String(h);$('address-input').value=label();document.querySelectorAll('#work-grid .door').forEach(el=>el.setAttribute('aria-disabled',String(!routeValid)));
  document.querySelectorAll('[data-sphere]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.sphere)===s)));
  document.querySelectorAll('[data-node]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.node)===n)));
  document.querySelectorAll('[data-house][data-field-sphere]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.house)===h&&Number(el.dataset.fieldSphere)===s)));
  $('coordinate-help').textContent='A place, not a proof. Role and parent definitions are bound to the original source. '+label();
 }
 function makeButton(text,title,selector,click){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',title);if(selector)for(const[k,v]of Object.entries(selector))b.dataset[k]=String(v);b.addEventListener('click',click);return b}
 for(let i=1;i<=12;i++){$('house-select').add(new Option('House '+pad(i),String(i)));
  const ss=makeButton(pad(i),'Select Sphere '+pad(i),{sphere:i},()=>{s=i;navigate()});$('spheres').append(ss);
  const nn=makeButton(pad(i),'Select Node '+pad(i),{node:i},()=>{n=i;navigate()});$('nodes').append(nn);
 }
 for(let x=1;x<=12;x++)for(let y=1;y<=12;y++){$('sphere-grid').append(makeButton('','House '+pad(x)+' Sphere '+pad(y),{house:x,fieldSphere:y},()=>{h=x;s=y;n=1;navigate();toast('Viewing '+label())}))}
 $('house-select').addEventListener('change',e=>{const v=clamp(Number(e.target.value));if(v){h=v;navigate()}});
 $('jump').addEventListener('click',jumpToAddress);$('address-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();jumpToAddress();}});
 ports.forEach(([id,title,desc],i)=>{const b=document.createElement('button');b.className='door';b.type='button';b.setAttribute('aria-pressed','false');b.setAttribute('aria-disabled','false');b.innerHTML='<span class="number">'+String(i+1).padStart(2,'0')+' / '+id.replaceAll('_',' ')+'</span><span class="status">UNBOUND</span><strong>'+title+'</strong><span>'+desc+'</span>';b.setAttribute('aria-label','Preview '+title+' Work room');b.addEventListener('click',()=>{if(!routeValid){clearWorkState('Invalid address: Work preview remains unavailable.');toast('Choose a valid canonical address first.');$('address-input').focus();return;}clearWorkState(title+': descriptor only; existing host not connected. No model was called.');workSelected=id;b.setAttribute('aria-pressed','true');toast(title+': descriptor only; existing host not connected. No model was called.');});$('work-grid').append(b)});
 modes.forEach(([id,title,desc])=>{$('private-buttons').append(makeButton(title,'Preview protected '+title+' door',null,()=>{$('private-view').textContent=title+' · '+desc+'. Protected navigation only: this demo cannot open, export or read its contents.';toast('Doorway preview only. Your boundaries remain intact.')}))});
 $('explore').addEventListener('click',()=>{$('lattice').scrollIntoView({behavior:'smooth',block:'start'});$('house-select').focus({preventScroll:true})});
 $('quiet').addEventListener('click',()=>{$('protected').scrollIntoView({behavior:'smooth',block:'start'});$('private-view').textContent='The Nook · It is enough to be here. No tasks, data or metrics.';toast('Quiet mode is a private doorway, not an automatic import.')});
 $('leave').addEventListener('click',()=>{h=s=n=1;navigate();$('private-view').textContent='Your visit was cleared from the page. Nothing was stored.';toast('You can leave. You can come back. Nothing was kept.')});
 function renderNet(){const g=$('net-lines'),points=$('net-points');const angles=Array.from({length:12},(_,i)=>i*Math.PI/6-Math.PI/2);const places=angles.map(a=>[230+182*Math.cos(a),230+182*Math.sin(a)]);
  for(let i=0;i<12;i++){for(let j=i+1;j<12;j++){if((j-i)%2===0 || (j-i)%3===0){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',places[i][0]);line.setAttribute('y1',places[i][1]);line.setAttribute('x2',places[j][0]);line.setAttribute('y2',places[j][1]);g.append(line)}}
   const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',places[i][0]);c.setAttribute('cy',places[i][1]);c.setAttribute('r',i%3===0?'6':'4');c.setAttribute('fill',i%3===0?'#bfa377':'#668f79');points.append(c)
  }
 }
 renderNet();update();
})();

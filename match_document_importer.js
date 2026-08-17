/* Admin daily match-document importer. PDF/TXT/CSV/JSON are processed in-browser, uploaded temporarily to a private Supabase bucket, then deleted after successful processing. */
(function(){
  let installed=false;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]));
  const fmt=iso=>iso?new Date(iso).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';

  function ui(){
    return `<div class="panel" id="matchDocumentImporter"><div class="section"><div><span class="badge">DAILY DOCUMENT IMPORT</span><h3>Upload today's real matches</h3><p class="muted">Drop a PDF, CSV, JSON or text file. The file is uploaded temporarily, processed, then deleted after a successful import. The importer never invents a match or player.</p></div></div><label for="mdi-file" class="dropzone" id="mdi-drop" style="display:block;border:2px dashed #888;border-radius:12px;padding:22px;text-align:center;cursor:pointer"><b>Drop today's file here or tap to choose</b><div class="small">PDF, CSV, JSON or TXT • one day's fixtures per file</div><input id="mdi-file" type="file" accept=".pdf,.csv,.json,.txt,text/plain,text/csv,application/pdf,application/json" style="display:none"></label><div id="mdi-status" class="muted" style="margin-top:12px"></div><div id="mdi-preview" style="margin-top:12px"></div><div class="actions" style="margin-top:12px"><button class="primary" id="mdi-import" disabled>Import verified rows</button></div></div>`;
  }

  async function pdfText(file){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    const data=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjs.getDocument({data}).promise;
    let out=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p); const c=await page.getTextContent();
      out.push(c.items.map(x=>x.str).join(' '));
    }
    return out.join('\n');
  }

  async function readText(file){
    const n=file.name.toLowerCase();
    if(n.endsWith('.pdf')) return pdfText(file);
    return file.text();
  }

  function parseRows(text){
    const rows=[]; const players=[];
    const lines=text.replace(/\r/g,'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
    for(const line of lines){
      const pm=line.match(/^PLAYER\s*[|,:]\s*([^|,:]+)\s*[|,:]\s*([^|,:]+)\s*[|,:]\s*(GK|DEF|MID|ST)$/i);
      if(pm){players.push({name:pm[1].trim(),club:pm[2].trim(),position:pm[3].toUpperCase()});continue;}
      const m=line.match(/^(?:\[[^\]]+\]\s*)?(?:([^|]+?)\s*[|,:]\s*)?([^|]+?)\s+(?:vs|v|-|–|—)\s+([^|]+?)(?:\s*[|,:]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:[T ](\d{1,2}:\d{2})(?::\d{2})?)?)?(?:\s*[|,:]\s*(scheduled|live|finished|postponed|cancelled|ft|aet))?$/i);
      if(!m) continue;
      const league=(m[1]||'').trim(); const home=m[2].trim(); const away=m[3].trim();
      if(!home||!away) continue;
      let date=m[4], time=m[5];
      if(!date){
        const dm=line.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/); date=dm?.[1];
      }
      if(!time){const tm=line.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);time=tm?.[0];}
      if(!date||!time) continue;
      let isoDate=date;
      if(/^[0-9]{1,2}[\/-]/.test(date)){
        const [a,b,c]=date.split(/[\/-]/).map(Number); const y=c<100?2000+c:c; isoDate=`${String(y).padStart(4,'0')}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`;
      }
      const kickoff=new Date(`${isoDate}T${time}:00`);
      if(Number.isNaN(kickoff.getTime())) continue;
      let status=(m[7]||'scheduled').toLowerCase(); if(status==='ft'||status==='aet')status='finished';
      rows.push({league:league||'Other',country:'',home_team:home,away_team:away,kickoff_at:kickoff.toISOString(),status});
    }
    const unique=[]; const seen=new Set();
    for(const r of rows){const k=[r.home_team.toLowerCase(),r.away_team.toLowerCase(),r.kickoff_at].join('|');if(!seen.has(k)){seen.add(k);unique.push(r);}}
    return {fixtures:unique,players};
  }

  async function uploadTemp(file,userId){
    const path=`${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const {error}=await supabase.storage.from('match-documents').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
    if(error)throw error;
    return path;
  }

  async function importRows(file, parsed, path){
    const status=document.querySelector('#mdi-status'); status.textContent=`Importing ${parsed.fixtures.length} fixtures...`;
    let created=0;
    for(const f of parsed.fixtures){
      const {error}=await supabase.rpc('admin_upsert_manual_fixture',{p_fixture_id:null,p_league_name:f.league,p_country:f.country||null,p_home_team:f.home_team,p_away_team:f.away_team,p_kickoff_at:f.kickoff_at,p_status:f.status});
      if(error) throw new Error(`${f.home_team} vs ${f.away_team}: ${error.message}`);
      created++;
    }
    let playersCreated=0;
    for(const p of parsed.players){
      const {error}=await supabase.from('players').upsert({name:p.name,club:p.club,position:p.position,active:true},{onConflict:'name,club'});
      if(!error)playersCreated++;
    }
    const {data:u}=await supabase.auth.getUser();
    if(u?.user){await supabase.from('match_document_imports').insert({uploaded_by:u.user.id,file_name:file.name,file_type:file.type||null,file_size:file.size,status:'completed',fixtures_created:created,players_created:playersCreated,completed_at:new Date().toISOString()});}
    await supabase.storage.from('match-documents').remove([path]);
    status.textContent=`Imported ${created} fixtures${playersCreated?` and ${playersCreated} players`:''}. Source file deleted.`;
  }

  async function handle(file){
    const status=document.querySelector('#mdi-status'),preview=document.querySelector('#mdi-preview'),btn=document.querySelector('#mdi-import');
    btn.disabled=true; preview.innerHTML='';
    try{
      if(!file)return; if(file.size>15*1024*1024)throw new Error('File is larger than 15 MB.');
      status.textContent='Reading document...';
      const text=await readText(file); const parsed=parseRows(text);
      if(!parsed.fixtures.length)throw new Error('No valid fixture rows were found. Include a real date, kickoff time and Home vs Away for each match.');
      window.__mdi={file,parsed};
      preview.innerHTML=`<div class="admin-row"><div><b>${parsed.fixtures.length} fixtures found</b><div class="small">${parsed.players.length} player rows found</div></div><div><b>Preview</b></div></div>`+parsed.fixtures.slice(0,20).map(f=>`<div class="small" style="padding:4px 0">${esc(f.league)} — ${esc(f.home_team)} vs ${esc(f.away_team)} — ${esc(fmt(f.kickoff_at))}</div>`).join('');
      btn.disabled=false; status.textContent='Document parsed. Click Import verified rows.';
    }catch(e){status.textContent=`Import stopped: ${e.message||e}`;}
  }

  async function install(){
    if(installed||typeof window.loadAdmin!=='function')return; installed=true;
    const original=window.loadAdmin;
    window.loadAdmin=async function(){await original();setTimeout(()=>{const main=document.querySelector('main.wrap');if(!main||document.querySelector('#matchDocumentImporter'))return;main.insertAdjacentHTML('afterbegin',ui());const input=document.querySelector('#mdi-file'),drop=document.querySelector('#mdi-drop');input.addEventListener('change',()=>handle(input.files[0]));drop.addEventListener('dragover',e=>{e.preventDefault();drop.style.opacity='.7'});drop.addEventListener('dragleave',()=>drop.style.opacity='1');drop.addEventListener('drop',e=>{e.preventDefault();drop.style.opacity='1';handle(e.dataTransfer.files[0])});document.querySelector('#mdi-import').addEventListener('click',async()=>{const x=window.__mdi;if(!x)return;const {data:u}=await supabase.auth.getUser();if(!u?.user)return alert('Please sign in as admin.');const btn=document.querySelector('#mdi-import');btn.disabled=true;let path=null;try{path=await uploadTemp(x.file,u.user.id);await importRows(x.file,x.parsed,path);window.__mdi=null;}catch(e){if(path)await supabase.storage.from('match-documents').remove([path]);document.querySelector('#mdi-status').textContent=`Import failed: ${e.message||e}`;btn.disabled=false;}},0)},0)};
  }
  const timer=setInterval(()=>{if(typeof window.loadAdmin==='function'){clearInterval(timer);install();}},100);
})();

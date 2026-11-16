(
    async()=>{
        const F=window.FinnsWorld;
        const sources=['Seek','LinkedIn','Indeed','Trade Me'];
        const checks=document.getElementById('source-checks');
        checks.innerHTML=sources.map((s,i)=>`<label class="check-item"><input type="checkbox" value="${s}" ${i===0?'checked':''}>${s}</label>`).join('');
        const country=document.getElementById('country-select');
        const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
        const codes=['NZ','AU','US','CA','GB','IE','DE','FR','NL','BE','CH','AT','SE','NO','DK','FI','ES','IT','PT','JP','KR','SG','CN','HK','TW','IN','AE','SA','BR','MX','ZA'];
        country.innerHTML='<option value="">All countries</option>'+codes.map(c=>`<option value="${c}">${regionNames.of(c)||c}</option>`).join('');

        async function loadJobs(){
            const qs=new URLSearchParams();
            checks.querySelectorAll('input:checked').forEach(x=>qs.append('source',x.value));
            if(country.value)qs.set('country',regionNames.of(country.value)||country.value);
            const list=document.getElementById('job-list');
            list.innerHTML='<div class="empty-state">Loading jobs…</div>';
            try{
                const jobs=await F.request('/jobs?'+qs.toString());
                list.innerHTML=jobs.length?jobs.map(job=>`<article class="job-card"><div><div class="job-title">${F.escape(job.title)}</div><div class="job-company">${F.escape(job.company)} · ${F.escape(job.source)}</div></div><div class="job-meta">${F.escape(job.region)}<br>${F.escape(job.country)}</div><div class="job-meta">Size: ${F.escape(job.company_size)}<br>Local: ${F.escape(job.local_reputation)} · Global: ${F.escape(job.global_reputation)}</div><div><span class="match">CV match · calculate on analyze</span><br><button class="analyze-btn" data-id="${job.id}">Analyze</button></div></article>`).join(''):'<div class="empty-state">No stored jobs match the current filters. The backend currently provides stored/test job records.</div>';
                list.querySelectorAll('.analyze-btn').forEach(b=>b.onclick=()=>analyze(b.dataset.id));
            }catch(e){
                list.innerHTML=`<div class="empty-state">${F.escape(e.message)}</div>`
            }
        }

        async function loadCVs(){
            const sel=document.getElementById('cv-library');
            try{
                const rows=await F.request('/jobs/cv-files');
                sel.innerHTML='<option value="">Stored CV files</option>'+rows.map(r=>`<option value="${r.id}">${F.escape(r.filename)}</option>`).join('')
            }catch(e){

            }
        }

        document.getElementById('job-refresh').onclick=loadJobs;
        checks.addEventListener('change',loadJobs);
        country.onchange=loadJobs;document.getElementById('cv-upload').onclick=async()=>{
            const file=document.getElementById('cv-file').files[0];
            if(!file)return F.toast('Please choose a PDF','error');
            const fd=new FormData();
            fd.append('file',file);
            try{
                await F.request('/jobs/cv-files',{
                    method:'POST',
                    body:fd
                });
                document.getElementById('cv-current').textContent=file.name;
                await loadCVs();
                F.toast('CV uploaded')
            }catch(e){
                F.toast(e.message,'error')
            }
        };
                
        document.getElementById('cv-clear').onclick=async()=>{
                    
            const id=document.getElementById('cv-library').value;
                    
            if(id){        
                try{     
                    await F.request(`/jobs/cv-files/${id}`,{method:'DELETE'});       
                    await loadCVs()    
                }catch(e){  
                    F.toast(e.message,'error')    
                }       
            }
                    
                    
            document.getElementById('cv-file').value='';       
            document.getElementById('cv-current').textContent='No file selected'      
        };

                
        const modal=document.getElementById('job-modal');
                
        modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal.classList.add('hidden'));
                
        async function analyze(id){
                    
            const box=document.getElementById('ai-result');
                    
            box.textContent='Analyzing…';      
            modal.classList.remove('hidden');
                    
            try{            
                const r=await F.request(`/jobs/${id}/analyze`,{method:'POST'});            
                box.innerHTML=`<h3>${F.escape(r.job_title)} · ${F.escape(r.company)}</h3><p>${F.escape(r.summary)}</p><strong>Highlights</strong><ul>${(r.matching_highlights||[]).map(x=>`<li>${F.escape(x)}</li>`).join('')||'<li>No highlights returned.</li>'}</ul><strong>Suggestions</strong><ul>${(r.suggestions||[]).map(x=>`<li>${F.escape(x)}</li>`).join('')}</ul>`         
            }catch(e){               
                box.textContent=e.message               
            }   
        }

        loadCVs();
        loadJobs();
        
    }
)();

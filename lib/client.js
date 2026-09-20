window.__ModuleLoader__.load({ id: 'dsh-session-manager', factory: (require) => {
  const React = require('react');
  const h = React.createElement;
  const css = '.dsm-footer-action{font:inherit;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 10px;cursor:pointer}.dsm-footer-action:hover{background:var(--dsw-alias-bg-overlay)}.dsm-modal input,.dsm-modal select{font:inherit;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 9px}.dsm-modal button,.dsm-popup button{font:inherit;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 10px;cursor:pointer}.dsm-modal button:hover,.dsm-popup button:hover{background:var(--dsw-alias-bg-overlay)}.dsm-modal button:disabled{opacity:.5;cursor:default}.dsm{padding:4px 0;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;max-width:860px}.dsm-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dsm input,.dsm select,.dsm button{font:inherit}.dsm input,.dsm select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:inherit;border-radius:7px;padding:7px 9px}.dsm button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:inherit;border-radius:7px;padding:7px 10px;cursor:pointer}.dsm button:disabled{opacity:.5;cursor:default}.dsm-tabs{display:flex;gap:6px}.dsm-tabs button.active{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}.dsm-count{color:var(--dsw-alias-label-tertiary);font-size:12px}.dsm-list{display:flex;flex-direction:column;gap:6px}.dsm-row{display:flex;align-items:center;gap:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px}.dsm-info{flex:1;min-width:0}.dsm-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-meta{font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsm-category-manager{border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px;display:flex;flex-direction:column;gap:8px}.dsm-category-header,.dsm-category-add,.dsm-category-item{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dsm-category-header{justify-content:space-between}.dsm-category-list{display:flex;flex-direction:column;gap:6px}.dsm-category-item{border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:7px}.dsm-category-name{min-width:72px;flex:1}.dsm-category-preview{font-size:11px;min-width:24px;text-align:center;border-radius:4px;padding:2px 4px}.dsm-category-manager label{font-size:12px;color:var(--dsw-alias-label-secondary)}.dsm-category-manager input[type=color]{width:30px;height:26px;padding:2px;vertical-align:middle}.dsm-error{font-size:12px;color:var(--dsw-alias-state-error-primary)}.dsm-badge{font-size:11px;border-radius:5px;padding:2px 6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}.dsm-danger{margin-left:8px;border-color:var(--dsw-alias-state-error-primary)!important;color:var(--dsw-alias-state-error-primary)!important}.dsm-danger:hover{background:var(--dsw-alias-state-error-primary)!important;color:#fff!important}.dsm-batch-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}.dsm-batch-row button{margin:0}.dsm-row-badge{flex:none;font-size:11px;line-height:16px;padding:0 6px;border-radius:8px;margin-right:2px;max-width:84px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  let workspacesApi;
  let sessionsApi;
  function CategoryManager({meta,onChanged}){const [name,setName]=React.useState('');const [background,setBackground]=React.useState('#E8EDF5');const [color,setColor]=React.useState('#1F2937');const [error,setError]=React.useState('');const [busy,setBusy]=React.useState('');const save=async(action,category,bg,fg)=>{setBusy(action+category);setError('');try{const r=await fetch('/dsh-session-manager/metadata',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action,category,background:bg,color:fg})});const x=await r.json().catch(()=>null);if(!r.ok||!x||!x.ok)throw new Error(x&&x.error?x.error:'保存失败');onChanged(x.state);if(action==='category-add')setName('');}catch(e){setError(e&&e.message?e.message:'操作失败');}finally{setBusy('');}};const styles=meta.categoryStyles||{};return h('section',{className:'dsm-category-manager'},h('div',{className:'dsm-category-header'},h('strong',null,'分类管理'),h('span',{className:'dsm-count'},'为标签设置背景与字体颜色')),h('div',{className:'dsm-category-add'},h('input',{value:name,onInput:e=>setName(e.currentTarget.value),onChange:e=>setName(e.currentTarget.value),placeholder:'新增分类'}),h('label',null,'底色 ',h('input',{type:'color',value:background,onChange:e=>setBackground(e.currentTarget.value)})),h('label',null,'字体 ',h('input',{type:'color',value:color,onChange:e=>setColor(e.currentTarget.value)})),h('button',{disabled:!name.trim()||!!busy,onClick:()=>save('category-add',name.trim(),background,color)},'添加')),error&&h('div',{className:'dsm-error'},error),h('div',{className:'dsm-category-list'},(meta.categories||[]).map(category=>{const style=styles[category]||{};const bg=style.background||'#E8EDF5';const fg=style.color||'#1F2937';const locked=category==='default';return h('div',{className:'dsm-category-item',key:category},h('span',{className:'dsm-category-preview',style:{background:bg,color:fg}},Array.from(category).slice(0,2).join('')),h('span',{className:'dsm-category-name'},category),h('label',null,'底色 ',h('input',{type:'color',value:bg,disabled:!!busy,onChange:e=>save('category-style',category,e.currentTarget.value,fg)})),h('label',null,'字体 ',h('input',{type:'color',value:fg,disabled:!!busy,onChange:e=>save('category-style',category,bg,e.currentTarget.value)})),h('button',{disabled:locked||!!busy,onClick:()=>save('category-delete',category)},locked?'默认':'删除'));})));}

  function Manager(props){
    const sessionsSnap = props.useSessions ? props.useSessions(s=>s) : {};
    const workspacesSnap = props.useWorkspaces ? props.useWorkspaces(s=>s) : {};
    const [meta,setMeta]=React.useState({sessions:{},categories:['default']}); const [tab,setTab]=React.useState('all'); const [q,setQ]=React.useState(''); const [cat,setCat]=React.useState(''); const [selected,setSelected]=React.useState(new Set()); const [newCat,setNewCat]=React.useState(''); const [busy,setBusy]=React.useState(false); const [notice,setNotice]=React.useState(''); const [info,setInfo]=React.useState(''); const [manageCategories,setManageCategories]=React.useState(false); const [confirm,setConfirm]=React.useState(null);
    const load=React.useCallback(()=>fetch('/dsh-session-manager/state',{cache:'no-store'}).then(r=>r.json()).then(x=>{setMeta(x);window.__DSH_SESSION_MANAGER_CATEGORIES__=x.sessions||{};window.__DSH_SESSION_MANAGER_CATEGORY_STYLES__=x.categoryStyles||{};window.__DSH_SESSION_MANAGER_TRASH__=x.trash||{};window.dispatchEvent(new Event('dsh-session-manager-metadata'));}).catch(()=>{}),[]); React.useEffect(()=>{load()},[load]);
    // 0.1.6: 子会话（subagent）在日常使用中不存在 —— 三个页签（全部/已归档/回收站）
    // 一律只显示父会话；父会话的删除/归档/恢复由其子树的谱系在宿主侧一起处理
    // （见 lib/index.js 的 subtreeOf）。这里只做显示层过滤。
    //
    // 空会话（只有会话头、没有任何消息）同样不列，与官方 browse 的
    // `!session.blank || session.id === current` 同规则：空会话没有标题，
    // displayTitle 会回退成**目录名**，于是一条空占位看起来就像一个工作区
    // （用户会误以为那是工作区本身，担心删了会让该工作区的会话变成无工作区）。
    const byId=sessionsSnap.byId||{}; const archived=new Set((workspacesSnap.archivedSessionIds||[])); const trash=new Set(Object.keys(meta.trash||{})); const baseIds=tab==='trash'?Object.keys(meta.trash||{}):(Array.isArray(sessionsSnap.ids)?sessionsSnap.ids:Object.keys(byId)); const isSub=s=>!!s&&(s.origin==='subagent'||s.parentId!==undefined); const mainId=Object.values(byId).find(x=>!!x&&((x.retainedBy&&x.retainedBy.mainView)||0)>0)?.id; const items=baseIds.map(id=>{const s=byId[id]||{}; const m=meta.sessions[id]||{}; return {id,title:m.title||s.displayTitle||s.title||id,cwd:m.cwd||s.cwd||'',updated:s.updatedAt||0,archived:archived.has(id)||m.archived===true,trashed:trash.has(id),category:m.category||'',sub:isSub(s),blank:s.blank===true};}).filter(x=>!x.sub&&(!x.blank||x.id===mainId)&&(tab==='archived'?(x.archived&&!x.trashed):(tab==='trash'?x.trashed:!x.archived&&!x.trashed))&&(!q||((x.title+' '+x.cwd+' '+x.id).toLowerCase().includes(q.toLowerCase())))&&(!cat||(cat==='__none'?!x.category:x.category===cat)));
    const toggle=id=>setSelected(prev=>{const n=new Set(prev); if(n.has(id))n.delete(id);else n.add(id);return n}); const allVisible=items.length>0&&items.every(x=>selected.has(x.id));
    async function action(kind){const ids2=[...selected];if(kind!=='purge-all'&&!ids2.length)return;setBusy(true);setNotice('');setInfo('');let result=null;try{const snaps={};if(kind==='trash'){for(const id of ids2){const it=items.find(x=>x.id===id);if(it)snaps[id]={title:it.title,cwd:it.cwd};}}const r=await fetch('/dsh-session-manager/metadata',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({ids:ids2,action:kind==='archive'?'archive':kind==='trash'?'trash':kind==='untrash'?'untrash':kind==='purge'?'purge':kind==='purge-all'?'purge-all':kind==='unarchive'?'unarchive':'categorize',category:newCat,sessions:snaps})});const x=result=await r.json().catch(()=>null);if(!r.ok||!x||!x.ok)throw new Error(x&&x.error?x.error:'操作失败');if(kind==='categorize')setNewCat('');if(kind==='archive'||kind==='trash'||kind==='untrash'||kind==='unarchive'||kind==='purge'||kind==='purge-all'){/* 0.1.6 breaking: `SessionListState.current` 与 `ISessions.clear` 均已从契约删除
           （替代面是 retain / using / retainInfo）。「被删的是不是当前会话」不再由本插件判断：
           选中态归壳层（ui-workspace / ui-session）自己处理，这里只保留下面的 refresh。 */try{await (sessionsApi&&sessionsApi.refresh?sessionsApi.refresh():Promise.resolve());}catch(_e){}try{await (workspacesApi&&workspacesApi.refresh?workspacesApi.refresh():Promise.resolve());}catch(_e){}}/* 只报用户可见（=选中的父会话）里被延后的数量；子树里被延后的不作为“待删除会话”提示，保持日常无感。 */const deferredVisible=result&&Array.isArray(result.deferred)?result.deferred.filter(id=>ids2.includes(id)):[];if(deferredVisible.length)setInfo('已标记 '+deferredVisible.length+' 个会话待删除：它们正在被使用，重启 DSH 后才会彻底清除。');setSelected(new Set());await load();}catch(e){setNotice(e&&e.message?e.message:'操作失败');}finally{setBusy(false)}}
    return h('div',{className:'dsm'},h('style',null,css),h('div',{className:'dsm-tabs'},h('button',{className:tab==='all'?'active':'',onClick:()=>setTab('all')},'全部'),h('button',{className:tab==='archived'?'active':'',onClick:()=>setTab('archived')},'已归档'),h('button',{className:tab==='trash'?'active':'',onClick:()=>setTab('trash')},'回收站'),h('span',{className:'dsm-count'},items.length+' 个会话')),h('div',{className:'dsm-toolbar'},h('input',{placeholder:'搜索标题、目录或 ID',value:q,onChange:e=>setQ(e.target.value)}),h('select',{value:cat,onChange:e=>setCat(e.target.value)},h('option',{value:''},'全部分类'),h('option',{value:'__none'},'未分类'),(meta.categories||[]).map(x=>h('option',{key:x,value:x},x))),h('input',{placeholder:'新分类（单级）',value:newCat,onChange:e=>setNewCat(e.target.value)}),h('button',{disabled:busy||!newCat.trim(),onClick:()=>action('categorize')},'新建分类'),h('button',{onClick:()=>setManageCategories(v=>!v)},manageCategories?'收起分类管理':'分类管理')),h('div',{className:'dsm-batch-row'},tab==='archived'?[h('button',{disabled:busy||!selected.size,onClick:()=>action('unarchive')},'批量恢复'),h('button',{disabled:busy||!selected.size,onClick:()=>action('trash')},'批量删除')]:tab==='trash'?[h('button',{disabled:busy||!selected.size,onClick:()=>action('untrash')},'批量恢复'),h('button',{className:'dsm-danger',disabled:busy||!selected.size,onClick:()=>setConfirm('purge')},'批量永删'),h('button',{className:'dsm-danger',disabled:busy,onClick:()=>setConfirm('purge-all')},'清空回收站')]:[h('button',{disabled:busy||!selected.size,onClick:()=>action('archive')},'批量归档'),h('button',{disabled:busy||!selected.size,onClick:()=>action('trash')},'批量删除')]),info&&h('div',{style:{color:'var(--dsw-alias-label-secondary)',fontSize:12}},info),notice&&h('div',{style:{color:'var(--dsw-alias-state-error-primary)',fontSize:12}},notice),manageCategories&&h(CategoryManager,{meta,onChanged:x=>{setMeta(x);window.__DSH_SESSION_MANAGER_CATEGORIES__=x.sessions||{};window.__DSH_SESSION_MANAGER_CATEGORY_STYLES__=x.categoryStyles||{};window.dispatchEvent(new Event('dsh-session-manager-metadata'));}}),h('label',null,h('input',{type:'checkbox',checked:allVisible,onChange:e=>setSelected(e.target.checked?new Set(items.map(x=>x.id)):new Set())}),' 全选（已选 '+selected.size+'）'),h('div',{className:'dsm-list'},items.filter(x=>cat!=='__none'||!x.category).map(x=>h('div',{className:'dsm-row',key:x.id,role:'checkbox','aria-checked':selected.has(x.id),tabIndex:0,onClick:()=>toggle(x.id),onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(x.id);}}},h('input',{type:'checkbox',checked:selected.has(x.id),onClick:e=>e.stopPropagation(),onChange:()=>toggle(x.id)}),h('div',{className:'dsm-info'},h('div',{className:'dsm-title'},x.title),h('div',{className:'dsm-meta'},x.cwd||x.id),h('div',{className:'dsm-meta'},x.updated?new Date(x.updated).toLocaleString():'未更新')),x.category&&h('span',{className:'dsm-badge'},x.category))),items.length===0&&h('div',{className:'dsm-count'},'没有匹配的会话'),confirm&&h('div',{className:'dsm-modal-backdrop',style:{position:'fixed',inset:0,zIndex:1001,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}},h('div',{className:'dsm-modal',role:'dialog',onPointerDown:e=>e.stopPropagation(),style:{minWidth:320,maxWidth:420,padding:16,borderRadius:10,background:'var(--dsw-alias-bg-layer-1)',display:'flex',flexDirection:'column',gap:10}},h('strong',null,confirm==='purge-all'?'清空回收站':'永久删除会话'),h('span',{style:{fontSize:13,color:'var(--dsw-alias-label-secondary)'}},confirm==='purge-all'?'将永久删除回收站中的全部会话，此操作不可恢复。':'将永久删除选中的 '+selected.size+' 个会话，此操作不可恢复。'),h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8}},h('button',{type:'button',disabled:busy,onClick:()=>setConfirm(null)},'取消'),h('button',{type:'button',disabled:busy,onClick:async()=>{const k=confirm;setConfirm(null);await action(k);}},busy?'删除中…':'确认永久删除'))))));
  }
  function CategoryModal({sessionId,onClose}){const [value,setValue]=React.useState('');const [cats,setCats]=React.useState([]);const [saving,setSaving]=React.useState(false);const [error,setError]=React.useState('');React.useEffect(()=>{fetch('/dsh-session-manager/state',{cache:'no-store'}).then(r=>r.json()).then(x=>{setCats(x.categories&&x.categories.length?x.categories:['default']);setValue((x.sessions&&x.sessions[sessionId]&&x.sessions[sessionId].category)||'');}).catch(()=>setCats(['default']));},[sessionId]);const change=e=>{setValue(e.currentTarget.value);setError('');};async function save(){const category=value.trim();setSaving(true);setError('');try{const r=await fetch('/dsh-session-manager/metadata',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(category?{ids:[sessionId],action:'categorize',category}:{ids:[sessionId],action:'uncategorize'})});const x=await r.json().catch(()=>null);if(!r.ok||!x||!x.ok)throw new Error(x&&x.error?x.error:'保存失败');window.__DSH_SESSION_MANAGER_CATEGORIES__=x.state.sessions||{};window.dispatchEvent(new Event('dsh-session-manager-metadata'));onClose();}catch(e){setError(e&&e.message?e.message:'保存失败');}finally{setSaving(false);}}return h('div',{className:'dsm-modal-backdrop',style:{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}},h('div',{className:'dsm-modal',role:'dialog',onPointerDown:e=>e.stopPropagation(),style:{minWidth:280,maxWidth:360,padding:16,borderRadius:10,background:'var(--dsw-alias-bg-layer-1)',display:'flex',flexDirection:'column',gap:10}},h('strong',null,'分类会话'),h('input',{autoFocus:true,disabled:saving,value,onInput:change,onChange:change,placeholder:'输入新分类（留空即不设置）'}),h('select',{disabled:saving,value,onChange:e=>{setValue(e.currentTarget.value);setError('');}},h('option',{value:''},'不设置类型'),cats.map(c=>h('option',{key:c,value:c},c)),value&&!cats.includes(value)?h('option',{key:value,value},value):null),error&&h('div',{style:{color:'var(--dsw-alias-state-error-primary)',fontSize:12}},error),h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8}},h('button',{type:'button',disabled:saving,onClick:onClose},'取消'),h('button',{type:'button',disabled:saving,onClick:save},saving?'保存中…':'确认'))));}
   function Footer(props){const [open,setOpen]=React.useState(false);const [sid,setSid]=React.useState(null);const [categoryOpen,setCategoryOpen]=React.useState(false);const [delSid,setDelSid]=React.useState(null);const [delBusy,setDelBusy]=React.useState(false);const [delErr,setDelErr]=React.useState('');async function doTrash(id){setDelBusy(true);setDelErr('');try{const r=await fetch('/dsh-session-manager/metadata',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({ids:[id],action:'trash'})});const x=await r.json().catch(()=>null);if(!r.ok||!x||!x.ok)throw new Error(x&&x.error?x.error:'删除失败');/* 0.1.6 breaking: 同上 —— `current` 与 `clear` 已删除，选中态归壳层。 */try{await (sessionsApi&&sessionsApi.refresh?sessionsApi.refresh():Promise.resolve());}catch(_e){}try{await (workspacesApi&&workspacesApi.refresh?workspacesApi.refresh():Promise.resolve());}catch(_e){}fetch('/dsh-session-manager/state',{cache:'no-store'}).then(r2=>r2.json()).then(s=>{window.__DSH_SESSION_MANAGER_CATEGORIES__=s.sessions||{};window.__DSH_SESSION_MANAGER_TRASH__=s.trash||{};window.dispatchEvent(new Event('dsh-session-manager-metadata'));}).catch(()=>{});}catch(e){setDelErr(e&&e.message?e.message:'删除失败');}finally{setDelBusy(false)}}React.useEffect(()=>{const push=s=>{window.__DSH_SESSION_MANAGER_CATEGORIES__=s.sessions||{};window.__DSH_SESSION_MANAGER_TRASH__=s.trash||{};window.dispatchEvent(new Event('dsh-session-manager-metadata'));};fetch('/dsh-session-manager/state',{cache:'no-store'}).then(r=>r.json()).then(push).catch(()=>{});const onCat=e=>{const id=e.detail&&e.detail.sessionId;if(id){setSid(id);setCategoryOpen(true)}};window.addEventListener('dsh-session-manager-category',onCat);const onDel=e=>{const id=e.detail&&e.detail.sessionId;if(id){setDelSid(id);setDelErr('')}};window.addEventListener('dsh-session-manager-delete',onDel);return()=>{window.removeEventListener('dsh-session-manager-category',onCat);window.removeEventListener('dsh-session-manager-delete',onDel)}},[]);return h(React.Fragment,null,h('style',null,css),h('button',{style:{width:'100%',textAlign:'left'},onClick:()=>setOpen(true)},'会话管理'),open&&h('div',{style:{position:'fixed',inset:0,zIndex:900,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}},h('div',{style:{width:'min(900px,92vw)',maxHeight:'90vh',overflow:'auto',padding:20,borderRadius:12,background:'var(--dsw-alias-bg-layer-1)'}},h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:12}},h('strong',null,'会话管理'),h('button',{onClick:()=>setOpen(false)},'关闭')),h(Manager,props))),categoryOpen&&sid&&h(CategoryModal,{sessionId:sid,onClose:()=>{setCategoryOpen(false);setSid(null)}}),delSid&&h('div',{className:'dsm-modal-backdrop',style:{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}},h('div',{className:'dsm-modal',role:'dialog',onPointerDown:e=>e.stopPropagation(),style:{minWidth:300,maxWidth:380,padding:16,borderRadius:10,background:'var(--dsw-alias-bg-layer-1)',display:'flex',flexDirection:'column',gap:10}},h('strong',null,'删除会话'),h('span',{style:{fontSize:13,color:'var(--dsw-alias-label-secondary)'}},'该会话将移入回收站，可随时恢复。'),delErr&&h('div',{style:{color:'var(--dsw-alias-state-error-primary)',fontSize:12}},delErr),h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8}},h('button',{type:'button',disabled:delBusy,onClick:()=>setDelSid(null)},'取消'),h('button',{type:'button',disabled:delBusy,onClick:async()=>{await doTrash(delSid);if(!delErr)setDelSid(null)}},delBusy?'删除中…':'移入回收站')))));}
   // ---------------------------------------------------------------------------
  // Session-row "..." menu decoration.
  //
  // 0.1.2's sidebar (ui-workspace) builds its per-session menu from a
  // hard-coded item array — rename / fork / archive — with no slot, service, or
  // event seam, and nothing in the composition dispatches the
  // `dsh-session-manager-category` / `dsh-session-manager-delete` window events
  // this plugin's Footer listens for (the 0.1.1 core shipped that integration;
  // 0.1.2 dropped it). So the plugin restores it from its own side: observe the
  // popup, append the two actions to it, and dispatch the events with the row's
  // session id.
  //
  // Session id: the row's React fiber carries `SessionNodeItem` props, whose
  // `node.id` is the session id. Walking up `__reactFiber$` from the row element
  // is the only identity source — the row DOM carries no id attribute.
  // ---------------------------------------------------------------------------
  const MENU_SELECTOR = '[role="menu"]';
  const MENU_ITEM_SELECTOR = 'button[role="menuitem"]';
  const ROW_SELECTOR = '[role="treeitem"]';
  const SESSION_ID_PREFIX = 'session-';
  const MENU_ACTIONS = [
    { key: 'category', label: '设置类型', icon: 'IconSettingsOutline16', event: 'dsh-session-manager-category' },
    { key: 'delete', label: '直接删除', icon: 'IconTrashOutline16', event: 'dsh-session-manager-delete' },
  ];
  const decoratedMenus = new WeakSet();
  const iconMarkupCache = new Map();
  let lastRowAnchor = null;

  /** Build a DOM node from a React element tree (icon components are hook-free). */
  function domFromElement(node){
    if(node===null||node===void 0||node===false||node===true)return null;
    if(typeof node==='string'||typeof node==='number')return document.createTextNode(String(node));
    if(Array.isArray(node)){const frag=document.createDocumentFragment();for(const child of node){const built=domFromElement(child);if(built)frag.appendChild(built);}return frag;}
    const type=node.type, props=node.props||{};
    if(typeof type==='function'){try{return domFromElement(type(props));}catch{return null;}}
    if(typeof type!=='string')return null;
    const svg=type==='svg'||type==='path'||type==='g'||type==='circle'||type==='rect';
    const el=document.createElementNS(svg?'http://www.w3.org/2000/svg':'http://www.w3.org/1999/xhtml',type);
    for(const [key,value] of Object.entries(props)){
      if(key==='children'||value===null||value===void 0||typeof value==='function'||typeof value==='boolean')continue;
      if(key==='className')el.setAttribute('class',String(value));
      else if(/^[a-z][a-z0-9-]*$/.test(key))el.setAttribute(key,String(value));
    }
    const children=domFromElement(props.children);
    if(children)el.appendChild(children);
    return el;
  }

  /** Real 0.1.2 icon markup for one primitives export, cached as a string. */
  function iconMarkupFor(name){
    if(iconMarkupCache.has(name))return iconMarkupCache.get(name);
    let markup='';
    try{
      const primitives=require('@deepseek-ai/dsh-client-ui-primitives');
      const Icon=primitives&&primitives[name];
      if(typeof Icon==='function'){const el=domFromElement(h(Icon,{}));if(el)markup=el.outerHTML;}
    }catch(_e){}
    iconMarkupCache.set(name,markup);
    return markup;
  }

  /** The session id of one sidebar row, read from its React fiber chain. */
  function sessionIdOfRow(row){
    if(!row)return null;
    const key=Object.keys(row).find(k=>k.indexOf('__reactFiber$')===0);
    if(!key)return null;
    let fiber=row[key];
    for(let i=0;fiber&&i<60;i+=1){
      const props=fiber.memoizedProps;
      const id=props&&props.node&&props.node.id;
      if(typeof id==='string'&&id.indexOf(SESSION_ID_PREFIX)===0)return id;
      fiber=fiber.return;
    }
    return null;
  }

  /** Close the shipped popup the way an outside pointer press does. */
  function closeShippedMenu(menu){
    if(!menu.isConnected)return;
    try{document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}catch(_e){}
    try{document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));}catch(_e){}
  }

  /** Append the two session-manager actions to one shipped session menu. */
  function decorateSessionMenu(menu,scope){
    if(decoratedMenus.has(menu))return;
    const template=menu.querySelector(MENU_ITEM_SELECTOR);
    if(!template||!template.parentElement)return;
    const row=lastRowAnchor&&lastRowAnchor.isConnected?lastRowAnchor:(document.activeElement instanceof Element?document.activeElement.closest(ROW_SELECTOR):null);
    const sessionId=sessionIdOfRow(row);
    if(!sessionId)return;
    let translate=null;
    try{const locale=scope.get('locale');if(locale)translate=locale.bind('workspace');}catch(_e){}
    if(typeof translate==='function'){
      const labels=Array.from(menu.querySelectorAll(MENU_ITEM_SELECTOR)).map(b=>b.textContent.trim());
      if(!labels.includes(translate('menu.archiveSession')))return;
    }
    decoratedMenus.add(menu);
    const wrap=template.parentElement;
    const container=wrap.parentElement;
    if(!container)return;
    for(const action of MENU_ACTIONS){
      const item=template.cloneNode(true);
      item.setAttribute('data-dsh-session-manager',action.key);
      const spans=Array.from(item.children).filter(el=>el.tagName==='SPAN');
      const iconSpan=spans[0], labelSpan=spans[spans.length-1];
      if(labelSpan&&labelSpan!==iconSpan)labelSpan.textContent=action.label;
      else item.textContent=action.label;
      const markup=iconMarkupFor(action.icon);
      if(iconSpan&&markup)iconSpan.innerHTML=markup;
      item.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent(action.event,{detail:{sessionId}}));
        closeShippedMenu(menu);
      });
      // One wrapper per item, exactly like the shipped rows.
      const ownWrap=wrap.cloneNode(false);
      ownWrap.appendChild(item);
      container.appendChild(ownWrap);
    }
  }

  /** Watch for shipped session menus; returns the fiber-owned disposer. */
  function watchSessionMenus(scope){
    const decorateAll=root=>{
      if(root.nodeType!==1)return;
      if(root.matches&&root.matches(MENU_SELECTOR))decorateSessionMenu(root,scope);
      if(root.querySelectorAll)for(const menu of root.querySelectorAll(MENU_SELECTOR))decorateSessionMenu(menu,scope);
    };
    const observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)decorateAll(node);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    const remember=event=>{
      const target=event.target;
      const row=target instanceof Element?target.closest(ROW_SELECTOR):null;
      if(row)lastRowAnchor=row;
    };
    document.addEventListener('pointerdown',remember,true);
    document.addEventListener('keydown',remember,true);
    return ()=>{
      observer.disconnect();
      document.removeEventListener('pointerdown',remember,true);
      document.removeEventListener('keydown',remember,true);
    };
  }

  // ---------------------------------------------------------------------------
  // Sidebar category badge.
  //
  // The 0.1.1 client half never painted this marker either: it only published
  // window.__DSH_SESSION_MANAGER_CATEGORIES__ / __DSH_SESSION_MANAGER_CATEGORY_STYLES__
  // and dispatched `dsh-session-manager-metadata`, and the 0.1.1 host rendered the
  // per-row marker from those. 0.1.2 dropped that integration the same way it
  // dropped the row-menu integration, so the plugin paints the badge itself:
  // a span inserted left of the row title, styled with the category's own
  // background/colour. React re-renders the row (time label, status dots) and
  // drops foreign children, so a coalesced MutationObserver repaints on demand.
  // ---------------------------------------------------------------------------
  const SIDEBAR_SLOT_SELECTOR = '[data-slot="sidebar.workspaces"]';
  const BADGE_CLASS = 'dsm-row-badge';
  const DEFAULT_BADGE = { background: '#E8EDF5', color: '#1F2937' };
  let rowCategories = {};
  let rowCategoryStyles = {};

  /** The row's title span — a CSS-module class ending in `_title`. */
  function titleSpanOfRow(row){
    for(const child of row.children){
      if(child.tagName!=='SPAN')continue;
      const cls=typeof child.className==='string'?child.className:'';
      if(/(^|\s)[A-Za-z0-9_-]*_title(\s|$)/.test(cls))return child;
    }
    return null;
  }

  /** Paint or clear one row's category badge; idempotent per repaint pass. */
  function decorateRowBadge(row){
    const title=titleSpanOfRow(row);
    if(!title)return;
    const sessionId=sessionIdOfRow(row);
    if(!sessionId)return;
    const record=rowCategories[sessionId];
    const category=record&&typeof record.category==='string'?record.category.trim():'';
    let badge=null;
    for(const child of row.children)if(child.classList&&child.classList.contains(BADGE_CLASS)){badge=child;break;}
    if(!category){
      if(badge)badge.remove();
      return;
    }
    const style=rowCategoryStyles[category]||{};
    const background=style.background||DEFAULT_BADGE.background;
    const color=style.color||DEFAULT_BADGE.color;
    if(!badge){
      badge=document.createElement('span');
      badge.className=BADGE_CLASS;
      row.insertBefore(badge,title);
    }else if(badge.nextSibling!==title){
      // React may reorder the row's own children on re-render; keep the badge
      // pinned immediately left of the title.
      row.insertBefore(badge,title);
    }
    if(badge.textContent!==category)badge.textContent=category;
    if(badge.style.background!==background)badge.style.background=background;
    if(badge.style.color!==color)badge.style.color=color;
    if(badge.title!==category)badge.title=category;
  }

  /** Repaint every session row inside one subtree. */
  function decorateRowBadges(root){
    if(!root||root.nodeType!==1)return;
    if(root.matches&&root.matches(ROW_SELECTOR))decorateRowBadge(root);
    if(root.querySelectorAll)for(const row of root.querySelectorAll(ROW_SELECTOR))decorateRowBadge(row);
  }

  /** Watch the sidebar and keep every row's category badge current. */
  function watchCategoryBadges(){
    let scheduled=false;
    const paint=()=>{
      scheduled=false;
      decorateRowBadges(document.querySelector(SIDEBAR_SLOT_SELECTOR)||document.body);
    };
    const schedule=()=>{
      if(scheduled)return;
      scheduled=true;
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(paint);
      else setTimeout(paint,16);
    };
    const load=()=>fetch('/dsh-session-manager/state',{cache:'no-store'}).then(r=>r.json()).then(x=>{
      rowCategories=x&&typeof x.sessions==='object'&&x.sessions!==null?x.sessions:{};
      rowCategoryStyles=x&&typeof x.categoryStyles==='object'&&x.categoryStyles!==null?x.categoryStyles:{};
      schedule();
    }).catch(()=>{});
    const onMetadata=()=>{load();};
    window.addEventListener('dsh-session-manager-metadata',onMetadata);
    const observer=new MutationObserver(records=>{
      const sidebar=document.querySelector(SIDEBAR_SLOT_SELECTOR);
      if(!sidebar){schedule();return;}
      for(const record of records){
        const target=record.target instanceof Element?record.target:null;
        if(target&&(target===sidebar||sidebar.contains(target))){schedule();return;}
        for(const node of record.addedNodes)if(node instanceof Element&&sidebar.contains(node)){schedule();return;}
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    load();
    return ()=>{
      observer.disconnect();
      window.removeEventListener('dsh-session-manager-metadata',onMetadata);
    };
  }

  // 0.1.2: acquire services through ctx.inject (waits for every named service)
  // instead of reading them once with ctx.get at apply time. The 0.1.1 build
  // bailed out silently whenever `slots` was not yet provided when this fiber
  // applied, which left the sidebar entry permanently missing.
  function apply(ctx){ ctx.inject(['slots','workspaces','sessions'],scope=>{ workspacesApi=scope.workspaces; sessionsApi=scope.sessions; scope.slots.inject('sidebar.footer.action',()=>scope.slots.register({name:'sidebar.footer.action',id:'dsh-session-manager-entry',order:-30,label:'会话管理'},Footer)); ctx.effect(()=>watchSessionMenus(scope),'dsh-session-manager: session row menu actions'); ctx.effect(()=>watchCategoryBadges(),'dsh-session-manager: sidebar category badges'); }); }
  return {apply};
 }});

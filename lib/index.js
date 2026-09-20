export const name = 'dsh-session-manager';
import { readFile, writeFile, mkdir, rename, readdir, access, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
const file = join(dshHome, 'profiles', 'web', 'dsh-session-manager.json');
const sessionsRoot = join(dshHome, 'sessions');
// 0.1.2: the projection cache keeps a per-session row that outlives the log
// unless it is removed explicitly. A stale row is what lets a purged session
// linger in the client's list, so a purge must drop both or neither.
const projectionCacheRoot = join(dshHome, 'storages', 'session_projcache', 'sessions');
const DEFAULT_CATEGORY = 'default';
const TRASH_LIMIT = 100;
const validColor = value => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '';
function normalize(value){const sessions=value&&typeof value.sessions==='object'?value.sessions:{};const categories=Array.isArray(value&&value.categories)?value.categories.filter(x=>typeof x==='string'&&x.trim()):[];if(!categories.includes(DEFAULT_CATEGORY))categories.unshift(DEFAULT_CATEGORY);const styles=value&&typeof value.categoryStyles==='object'?value.categoryStyles:{};const categoryStyles={};for(const name of categories){const style=styles[name]||{};const background=validColor(style.background);const color=validColor(style.color);if(background||color)categoryStyles[name]={...(background?{background}:{}),...(color?{color}:{})};}const rawTrash=value&&typeof value.trash==='object'?value.trash:{};const trash={};for(const [id,at] of Object.entries(rawTrash)){if(typeof at==='number'&&Number.isFinite(at))trash[id]=at;}const rawPending=value&&typeof value.pendingPurge==='object'?value.pendingPurge:{};const pendingPurge={};for(const [id,at] of Object.entries(rawPending)){if(typeof at==='number'&&Number.isFinite(at))pendingPurge[id]=at;}return {sessions,categories,categoryStyles,trash,pendingPurge};}
async function readState(){try{return normalize(JSON.parse(await readFile(file,'utf8')));}catch{return normalize({});}}
async function saveState(state){await mkdir(dirname(file),{recursive:true});const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(normalize(state),null,2)+'\n','utf8');await rename(tmp,file);}
async function purgeSessionDir(id){try{const entries=await readdir(sessionsRoot,{withFileTypes:true});for(const e of entries){if(!e.isDirectory())continue;const target=join(sessionsRoot,e.name,id);try{await access(target);}catch{continue;}await rm(target,{recursive:true,force:true});return true;}}catch{}return false;}
async function purgeProjectionCache(id){try{await rm(join(projectionCacheRoot,id+'.json'),{force:true});}catch{}}
// A live (in-memory) session cannot be disposed from a plugin: 0.1.2 exposes no
// session close/delete RPC, and `ctx.sessions` is a read-only store. Unlinking
// the log of such a session is what produced the "ungrouped, readable but every
// write fails with ENOENT" zombie, so liveness must gate every purge.
function sessionIsLive(ctx,id){try{const store=ctx&&typeof ctx.get==='function'?ctx.get('sessions'):void 0;return !!(store&&typeof store.get==='function'&&store.get(id)!==void 0);}catch{return false;}}
const workspaceFile = join(dshHome, 'storages', 'workspace.json');
async function unarchiveInWorkspace(ids){try{const w=JSON.parse(await readFile(workspaceFile,'utf8'));const g=w&&w.global;if(!g||!Array.isArray(g.archivedSessionIds))return;const set=new Set(ids);const kept=g.archivedSessionIds.filter(x=>!set.has(x));if(kept.length===g.archivedSessionIds.length)return;g.archivedSessionIds=kept;const tmp=workspaceFile+'.tmp';await writeFile(tmp,JSON.stringify(w,null,2)+'\n','utf8');await rename(tmp,workspaceFile);}catch{}}
async function removeFromWorkspaceAccountingFile(ids){try{const w=JSON.parse(await readFile(workspaceFile,'utf8'));let changed=false;const set=new Set(ids);const g=w&&w.global;if(g&&Array.isArray(g.archivedSessionIds)){const kept=g.archivedSessionIds.filter(x=>!set.has(x));if(kept.length!==g.archivedSessionIds.length){g.archivedSessionIds=kept;changed=true;}}const workspaces=w&&w.tables&&w.tables.workspaces;if(workspaces&&typeof workspaces==='object'){for(const record of Object.values(workspaces)){if(!record||!Array.isArray(record.sessionIds))continue;const kept=record.sessionIds.filter(x=>!set.has(x));if(kept.length!==record.sessionIds.length){record.sessionIds=kept;changed=true;}}}if(!changed)return;const tmp=workspaceFile+'.tmp';await writeFile(tmp,JSON.stringify(w,null,2)+'\n','utf8');await rename(tmp,workspaceFile);}catch{}}
// 0.1.2: the ONE unarchive path, used by both the trash and unarchive actions.
// The live workspaceRegistry is preferred because its setState emits
// domain/changed (the client archive set updates with no reload), and routing
// every unarchive through it keeps the registry's in-memory state from
// diverging from workspace.json — a stale cache would otherwise resurrect an
// already-unarchived id on the next archiveSession.
async function unarchiveSessions(ctx,ids){const list=await subtreeOf(ctx&&ctx.get('sessionQuery'),ids);const wreg=ctx&&ctx.get('workspaceRegistry');if(wreg&&typeof wreg.enqueueOperation==='function'&&typeof wreg.requireState==='function'&&typeof wreg.setState==='function'){try{const set=new Set(list.map(String));await wreg.enqueueOperation(async()=>{const st=wreg.requireState();const arch=Array.isArray(st.archivedSessionIds)?st.archivedSessionIds:[];const kept=arch.filter(x=>!set.has(String(x)));if(kept.length===arch.length)return;await wreg.setState({...st,archivedSessionIds:kept});});return true;}catch{}}await unarchiveInWorkspace(list);return false;}
// 0.1.2: archive is the only core mechanism that hides a session from every
// sidebar grouping surface, and it keeps the workspace accounting slot so
// unarchiving restores the original position. The plugin's "delete" needs it:
// 0.1.1's host-side integration (which hid trashed sessions) is gone, so
// without archiving a "deleted" session stays visible and fully usable.
async function archiveInWorkspace(ids){try{const w=JSON.parse(await readFile(workspaceFile,'utf8'));const g=w&&w.global;if(!g||!Array.isArray(g.archivedSessionIds))return;const have=new Set(g.archivedSessionIds.map(String));let changed=false;for(const id of ids.map(String))if(!have.has(id)){g.archivedSessionIds.push(id);have.add(id);changed=true;}if(!changed)return;const tmp=workspaceFile+'.tmp';await writeFile(tmp,JSON.stringify(w,null,2)+'\n','utf8');await rename(tmp,workspaceFile);}catch{}}
// ── 子树展开（0.1.6 起）────────────────────────────────────────────────────
// 子会话（subagent）在界面上不可见，因此「子会话」这个概念对用户不存在：删除 / 归档 /
// 恢复父会话时，整棵子树一起处理，用户不需要知道它们。
//
// 谱系来自宿主权威语料 sessionQuery.listSessions()（header.origin === 'subagent' 且
// header.parentSession 指向父会话），而不是客户端的列表快照——后者可能不完整。
// `openAt: 'never'`（本 profile 的默认）只关闭全文检索，不关闭 listSessions：
// 它继承自未受该开关限制的基类。
//
// 降级：拿不到 sessionQuery 或读语料失败时，只在传入的 id 上操作（等价于旧行为），
// 不抛错、不阻断请求。传入但已不存在于语料的 id 仍原样保留（让上层照旧处理它）。
async function subtreeOf(sessionQuery, roots) {
	const list = roots.map(String);
	if (!list.length) return list;
	if (!sessionQuery || typeof sessionQuery.listSessions !== 'function') return list;
	let records = [];
	try { records = await sessionQuery.listSessions(); } catch { return list; }
	const kids = new Map();
	for (const record of records || []) {
		const header = record && record.header;
		if (!header || header.origin !== 'subagent' || typeof header.parentSession !== 'string') continue;
		const arr = kids.get(header.parentSession);
		if (arr === undefined) kids.set(header.parentSession, [header.id]);
		else arr.push(header.id);
	}
	const seen = new Set(list);
	const out = [...list];
	const stack = [...list];
	while (stack.length) {
		const children = kids.get(stack.pop());
		if (children === undefined) continue;
		for (const child of children) {
			if (seen.has(child)) continue;
			seen.add(child);
			out.push(child);
			stack.push(child);
		}
	}
	return out;
}
async function archiveSessions(ctx,ids){const list=await subtreeOf(ctx&&ctx.get('sessionQuery'),ids);if(!list.length)return false;const wreg=ctx&&ctx.get('workspaceRegistry');if(wreg&&typeof wreg.archiveSession==='function'){/* 逐 id 容错：一个已消失的 id 不应让整批回退到直写文件（那会把未知 id 也写进归档表，并与 registry 内存态分歧） */let landed=0;for(const id of list){try{await wreg.archiveSession(id);landed+=1;}catch{}}if(landed>0)return true;}await archiveInWorkspace(list);return false;}
// Purge splits by liveness: a cold session loses its log and its cache row at
// once, while a live one is only archived and recorded in `pendingPurge` —
// apply() drains that list on the next start, when nothing is live any more.
async function purgeSessions(ctx,state,ids){const list=await subtreeOf(ctx&&ctx.get('sessionQuery'),ids);const deferred=[];for(const id of list){delete state.trash[id];delete state.sessions[id];if(sessionIsLive(ctx,id)){state.pendingPurge[id]=Date.now();deferred.push(id);continue;}await purgeSessionDir(id);await purgeProjectionCache(id);}if(deferred.length)await archiveSessions(ctx,deferred);const immediate=list.filter(id=>!deferred.includes(id));if(immediate.length)await removeFromWorkspaceAccounting(ctx,immediate);return deferred;}
async function flushPendingPurge(ctx){try{const state=await readState();const ready=Object.keys(state.pendingPurge).filter(id=>!sessionIsLive(ctx,id));if(!ready.length)return;for(const id of ready){await purgeSessionDir(id);await purgeProjectionCache(id);delete state.pendingPurge[id];delete state.sessions[id];delete state.trash[id];}await removeFromWorkspaceAccounting(ctx,ready);await saveState(state);}catch{}}
// 0.1.2: prefer the live workspaceRegistry so its in-memory state stays in
// sync and every write emits domain/changed (the client workspace feed then
// drops the purged sessions without a reload). The direct-file path stays as
// the fallback for a composition without the registry.
async function removeFromWorkspaceAccounting(ctx,ids){const set=new Set(ids.map(String));const wreg=ctx&&ctx.get('workspaceRegistry');if(wreg&&typeof wreg.list==='function'){try{for(const ws of wreg.list()){if(!ws||typeof ws.detachSession!=='function'||!Array.isArray(ws.sessionIds))continue;for(const sid of ws.sessionIds.slice())if(set.has(String(sid)))await ws.detachSession(sid);}if(typeof wreg.enqueueOperation==='function'&&typeof wreg.requireState==='function'&&typeof wreg.setState==='function'){await wreg.enqueueOperation(async()=>{const st=wreg.requireState();const arch=Array.isArray(st.archivedSessionIds)?st.archivedSessionIds:[];const kept=arch.filter(x=>!set.has(String(x)));if(kept.length!==arch.length)await wreg.setState({...st,archivedSessionIds:kept});});}return;}catch{}}await removeFromWorkspaceAccountingFile(ids);}
function json(res,status,value){res.writeHead(status,{'cache-control':'no-store','content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});res.end(JSON.stringify(value));}
function trusted(req){try{return !!req.headers.host&&(!req.headers.origin||new URL(req.headers.origin).host===req.headers.host);}catch{return false;}}
async function body(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
function categoryName(value){return typeof value==='string'?value.trim().replace(/[\/]/g,'').slice(0,80):'';}
function cleanIds(value){return Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.length<300):[];}
async function enforceTrashLimit(ctx,state){const entries=Object.entries(state.trash).sort((a,b)=>a[1]-b[1]);const ids=[];let overflow=entries.length-TRASH_LIMIT;for(const [id] of entries){if(overflow<=0)break;ids.push(id);overflow--;}if(ids.length)await purgeSessions(ctx,state,ids);}
export function apply(ctx){flushPendingPurge(ctx);ctx.inject(['webServer'],host=>{const web=host.webServer;const a=web.register({kind:'exact',path:'/dsh-session-manager/state',handler:async(req,res)=>{if(req.method!=='GET')return json(res,405,{error:'method'});json(res,200,await readState());}});const b=web.register({kind:'exact',path:'/dsh-session-manager/metadata',handler:async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'});return res.end();}if(req.method!=='POST')return json(res,405,{error:'method'});if(!trusted(req))return json(res,403,{error:'untrusted origin',origin:req.headers.origin,host:req.headers.host});try{const input=await body(req);const state=await readState();const category=categoryName(input.category);const action=input.action;let deferred=[];if(action==='category-add'){if(!category)return json(res,400,{error:'category required'});if(!state.categories.includes(category))state.categories.push(category);}else if(action==='category-delete'){if(!category||category===DEFAULT_CATEGORY)return json(res,400,{error:'default category cannot be deleted'});state.categories=state.categories.filter(x=>x!==category);delete state.categoryStyles[category];for(const id of Object.keys(state.sessions))if(state.sessions[id].category===category)state.sessions[id]={...state.sessions[id],category:''};}else if(action==='category-style'){if(!category||!state.categories.includes(category))return json(res,400,{error:'category not found'});const background=validColor(input.background);const color=validColor(input.color);state.categoryStyles[category]={...(background?{background}:{}),...(color?{color}:{})};}else if(action==='categorize'){const ids=cleanIds(input.ids);if(!category)return json(res,400,{error:'category required'});if(!state.categories.includes(category))state.categories.push(category);for(const id of ids)state.sessions[id]={...(state.sessions[id]||{}),category};}else if(action==='uncategorize'){const ids=cleanIds(input.ids);for(const id of ids){const record=state.sessions[id];if(!record)continue;const next={...record};delete next.category;if(Object.keys(next).length)state.sessions[id]=next;else delete state.sessions[id];}}else if(action==='trash'){const ids=cleanIds(input.ids);const now=Date.now();const snaps=input.sessions&&typeof input.sessions==='object'?input.sessions:{};for(const id of ids){state.trash[id]=now;const old=state.sessions[id]||{};const snap=snaps[id]||{};const title=typeof snap.title==='string'?snap.title.slice(0,200):'';const cwd=typeof snap.cwd==='string'?snap.cwd.slice(0,400):'';state.sessions[id]={...(old||{}),...(title?{title}:{}),...(cwd?{cwd}:{})};}await archiveSessions(ctx,ids);await enforceTrashLimit(ctx,state);}else if(action==='archive'){const ids=cleanIds(input.ids);await archiveSessions(ctx,ids);}else if(action==='untrash'){const ids=cleanIds(input.ids);for(const id of ids){delete state.trash[id];}await unarchiveSessions(ctx,ids);}else if(action==='unarchive'){const ids=cleanIds(input.ids);await unarchiveSessions(ctx,ids);}else if(action==='purge'){const ids=cleanIds(input.ids);deferred=await purgeSessions(ctx,state,ids);}else if(action==='purge-all'){const ids=Object.keys(state.trash);deferred=await purgeSessions(ctx,state,ids);}else return json(res,400,{error:'unknown action'});await saveState(state);json(res,200,{ok:true,state,deferred});}catch(e){json(res,400,{error:String(e)});}}});return()=>{a();b();};});}

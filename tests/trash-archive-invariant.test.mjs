#!/usr/bin/env node
/**
 * 「删除 ⟹ 已归档」不变量测试（host 侧，真实执行插件代码）
 *
 * 背景：dsh-qq-bridge 从「读 dsh-session-manager 的私有状态文件」改为
 * 「读 DSH 核心服务 workspaceRegistry 的 archivedSessionIds」。这条新契约成立的
 * 前提是：会话进 trash / pendingPurge 时，**一定**也会进 registry 的归档集。
 *
 * 本测试真实加载 plugins/dsh-session-manager/code/index.js，用假的 DSH 服务驱动它，
 * 覆盖 archiveSessions 会静默失败的三种情形：
 *   ① archiveSession 全部抛错（旧代码 → 兜底直写文件，且文件缺 global 段时空转）
 *   ② 只有一部分成功（旧代码 landed>0 直接 return true，部分失败被当成成功）
 *   ③ 写文件成功但 registry 内存态没更新（消费者读的正是内存态）
 *
 * 用法：node plugins/dsh-session-manager/tests/trash-archive-invariant.test.mjs
 * 退出码：0 = 全部通过
 */
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const PLUGIN = new URL('../code/index.js', import.meta.url);

let passed = 0, failed = 0;
const check = (name, cond, detail = '') => {
	if (cond) { passed += 1; console.log(`  ✓ ${name}`); }
	else { failed += 1; console.log(`  ✗ ${name} ${detail}`); }
};

/** 造一个只实现插件实际用到的那几个方法的假 ctx */
function makeCtx({ archiveMode = 'ok', sessions = [] } = {}) {
	const state = { initialized: true, workspaceIds: [], archivedSessionIds: [], tables: { workspaces: {} } };
	const failSet = new Set();
	const registry = {
		requireState: () => state,
		setState: async (next) => { Object.assign(state, next); },
		enqueueOperation: async (fn) => await fn(),
		list: () => [],
		archiveSession: async (id) => {
			if (archiveMode === 'all-throw') throw new Error('archiveSession unavailable');
			if (archiveMode === 'partial-throw' && failSet.has(id)) throw new Error('archiveSession failed for ' + id);
			if (!state.archivedSessionIds.includes(id)) state.archivedSessionIds.push(id);
		},
	};
	// 让调用方能在 partial 模式下指定哪些 id 失败
	registry.__failIds = (ids) => { for (const id of ids) failSet.add(id); };

	const handlers = new Map();
	const ctx = {
		_injectHost: null,
		get(name) {
			if (name === 'workspaceRegistry') return registry;
			if (name === 'sessionQuery') return { listSessions: async () => sessions };
			if (name === 'sessions') return new Map(); // 全都不 live → purge 立即执行
			return undefined;
		},
		inject(_names, cb) {
			const host = {
				webServer: {
					register({ path, handler }) { handlers.set(path, handler); return () => handlers.delete(path); },
				},
			};
			cb(host);
		},
	};
	return { ctx, registry, state, handlers };
}

/** 调 POST /dsh-session-manager/metadata */
async function post(handlers, body) {
	const handler = handlers.get('/dsh-session-manager/metadata');
	if (!handler) throw new Error('metadata 路由未注册');
	const req = {
		method: 'POST',
		headers: { host: '127.0.0.1:19387', 'content-type': 'application/json' },
		async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)); },
	};
	let out = null;
	const res = { writeHead() {}, end(s) { out = JSON.parse(s); } };
	await handler(req, res);
	return out;
}

console.log('trash⟹archived 不变量测试\n');

// ── 用例 1：常规删除 → 必须进归档集 ──────────────────────────────────────
{
	const home = await mkdtemp(join(tmpdir(), 'dsm-inv-'));
	await mkdir(join(home, 'storages'), { recursive: true });
	await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ global: { initialized: true, archivedSessionIds: [] }, tables: { workspaces: {} } }));
	process.env.DSH_HOME = home;
	const mod = await import(`${pathToFileURL(fileURLToPath(PLUGIN)).href}?case=1`);
	const { ctx, state, handlers } = makeCtx();
	mod.apply(ctx);
	const r = await post(handlers, { action: 'trash', ids: ['session-A'] });
	check('C1 请求成功', r?.ok === true, JSON.stringify(r));
	check('C1 trash 后 id 进入 registry 归档集', state.archivedSessionIds.includes('session-A'), JSON.stringify(state.archivedSessionIds));
	await rm(home, { recursive: true, force: true });
}

// ── 用例 2：archiveSession 全部抛错 → 仍必须进归档集（失败路径①③）──────
{
	const home = await mkdtemp(join(tmpdir(), 'dsm-inv-'));
	await mkdir(join(home, 'storages'), { recursive: true });
	// 刻意让 workspace.json 的 global 段**没有** archivedSessionIds：
	// 旧实现此时 archiveInWorkspace 会静默空转，什么也不写
	await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ global: { initialized: true }, tables: { workspaces: {} } }));
	process.env.DSH_HOME = home;
	const mod = await import(`${pathToFileURL(fileURLToPath(PLUGIN)).href}?case=2`);
	const { ctx, state, handlers } = makeCtx({ archiveMode: 'all-throw' });
	mod.apply(ctx);
	const r = await post(handlers, { action: 'trash', ids: ['session-B'] });
	check('C2 请求成功', r?.ok === true, JSON.stringify(r));
	check('C2 archiveSession 全失败时，仍由 registry state 补齐归档集', state.archivedSessionIds.includes('session-B'), JSON.stringify(state.archivedSessionIds));
	await rm(home, { recursive: true, force: true });
}

// ── 用例 3：部分失败（旧代码最容易漏的一种）──────────────────────────────
{
	const home = await mkdtemp(join(tmpdir(), 'dsm-inv-'));
	await mkdir(join(home, 'storages'), { recursive: true });
	await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ global: { initialized: true, archivedSessionIds: [] }, tables: { workspaces: {} } }));
	process.env.DSH_HOME = home;
	const mod = await import(`${pathToFileURL(fileURLToPath(PLUGIN)).href}?case=3`);
	const { ctx, registry, state, handlers } = makeCtx({ archiveMode: 'partial-throw' });
	registry.__failIds(['session-C2']); // 3 个里坏 1 个
	mod.apply(ctx);
	const r = await post(handlers, { action: 'trash', ids: ['session-C1', 'session-C2', 'session-C3'] });
	check('C3 请求成功', r?.ok === true, JSON.stringify(r));
	check('C3 部分失败时，缺失的那个也被补齐',
		['session-C1', 'session-C2', 'session-C3'].every((id) => state.archivedSessionIds.includes(id)),
		JSON.stringify(state.archivedSessionIds));
	await rm(home, { recursive: true, force: true });
}

// ── 用例 4：启动修补历史遗留（在 trash 但未归档）─────────────────────────
{
	const home = await mkdtemp(join(tmpdir(), 'dsm-inv-'));
	await mkdir(join(home, 'storages'), { recursive: true });
	await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ global: { initialized: true, archivedSessionIds: [] }, tables: { workspaces: {} } }));
	// 模拟旧版本留下的状态：会话在 trash 里，但归档集是空的
	await writeFile(join(home, 'dsh-session-manager.json'), JSON.stringify({ trash: { 'session-D': Date.now() }, pendingPurge: { 'session-E': Date.now() }, sessions: {}, categories: ['default'] }));
	process.env.DSH_HOME = home;
	const mod = await import(`${pathToFileURL(fileURLToPath(PLUGIN)).href}?case=4`);
	const { ctx, state } = makeCtx();
	mod.apply(ctx);
	await new Promise((r) => setTimeout(r, 80)); // repair 是 fire-and-forget
	check('C4 启动时补上 trash 中未归档的会话', state.archivedSessionIds.includes('session-D'), JSON.stringify(state.archivedSessionIds));
	// pendingPurge 里的**冷**会话由 flushPendingPurge 在启动时真正清除（日志目录 + 投影缓存一起删），
	// 因此它既不该残留在 pendingPurge，也不该进归档集——消费者再也看不到它。
	const persisted = JSON.parse(await readFile(join(home, 'dsh-session-manager.json'), 'utf8'));
	check('C4 pendingPurge 的冷会话被真正清除、不残留',
		!('session-E' in (persisted.pendingPurge ?? {})) && !('session-E' in (persisted.trash ?? {})),
		JSON.stringify({ pendingPurge: persisted.pendingPurge, trash: persisted.trash }));
	check('C4 已清除的会话不会残留在归档集里（避免归档集积垃圾）',
		!state.archivedSessionIds.includes('session-E'), JSON.stringify(state.archivedSessionIds));
	await rm(home, { recursive: true, force: true });
}

// ── 用例 5：消费者视角——listSessions 仍返回已删会话，靠归档集才能滤掉 ──
{
	const home = await mkdtemp(join(tmpdir(), 'dsm-inv-'));
	await mkdir(join(home, 'storages'), { recursive: true });
	await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({ global: { initialized: true, archivedSessionIds: [] }, tables: { workspaces: {} } }));
	process.env.DSH_HOME = home;
	const mod = await import(`${pathToFileURL(fileURLToPath(PLUGIN)).href}?case=5`);
	// listSessions 同时返回「已删」与「未删」两个会话——这正是 qq-bridge 注释所述的行为
	const sessions = [{ header: { id: 'session-DEL', createdAt: 2 } }, { header: { id: 'session-KEEP', createdAt: 1 } }];
	const { ctx, state, handlers } = makeCtx({ sessions });
	mod.apply(ctx);
	await post(handlers, { action: 'trash', ids: ['session-DEL'] });

	// qq-bridge 的过滤谓词（新实现）：只保留不在归档集里的
	const visible = sessions.filter((r) => !state.archivedSessionIds.includes(r.header.id)).map((r) => r.header.id);
	check('C5 已删会话被归档集滤掉', !visible.includes('session-DEL'), JSON.stringify(visible));
	check('C5 未删会话保留', visible.includes('session-KEEP'), JSON.stringify(visible));
	check('C5 不变量成立：trash ⊆ archived', ['session-DEL'].every((id) => state.archivedSessionIds.includes(id)));
	await rm(home, { recursive: true, force: true });
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);

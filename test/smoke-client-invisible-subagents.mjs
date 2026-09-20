/**
 * dsh-session-manager × DSH 0.1.6-alpha.2 — "subagents are invisible" render smoke.
 *
 * Contract: the plugin's three tabs (全部 / 已归档 / 回收站) must never render a
 * subagent session. The user should never have to know the concept exists; the
 * subtree is handled on the host (see test/smoke-cascade-actions.mjs).
 *
 * This drives the REAL bundle: stubbed `window.__ModuleLoader__`, a minimal React
 * hook runtime (with a cell store, so the plugin's own setState survives into a
 * second render pass), `useState` forced to the interesting values (panel open,
 * chosen tab), the real `Manager` render tree walked as plain objects, and the
 * plugin's own `/dsh-session-manager/state` fetch stubbed.
 *
 * Usage: node test/smoke-client-invisible-subagents.mjs [path-to-client.js]
 * Exit: 0 = all PASS, 1 = at least one FAIL.
 */
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLIENT = process.argv[2] ?? path.join(HERE, '..', 'lib', 'client.js')

const results = []
const check = (step, ok, detail = '') => {
  results.push({ step, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? '  — ' + detail : ''}`)
}

// ── fixture: 2 parents + 2 subagents (one declared by origin, one by parentId) ─
const PARENT_A = { id: 'session-parent-a', displayTitle: '父会话甲', cwd: 'D:\\DSH\\a' }
const PARENT_B = { id: 'session-parent-b', displayTitle: '父会话乙', cwd: 'D:\\DSH\\b' }
const SUB_BY_ORIGIN = { id: 'sub-by-origin', displayTitle: '子会话甲', cwd: 'D:\\DSH\\a', origin: 'subagent', parentId: 'session-parent-a' }
const SUB_BY_PARENTID = { id: 'sub-by-parentid', displayTitle: '子会话乙', cwd: 'D:\\DSH\\a', parentId: 'session-parent-a' }

const sessionsSnap = {
  ids: [PARENT_A.id, SUB_BY_ORIGIN.id, PARENT_B.id, SUB_BY_PARENTID.id],
  byId: {
    [PARENT_A.id]: PARENT_A,
    [PARENT_B.id]: PARENT_B,
    [SUB_BY_ORIGIN.id]: SUB_BY_ORIGIN,
    [SUB_BY_PARENTID.id]: SUB_BY_PARENTID,
  },
}
let stateJson = { sessions: {}, categories: ['default'], trash: {}, categoryStyles: {} }

// ── browser stubs ───────────────────────────────────────────────────────────
let captured
const rt = { effects: [], tab: 'all', cells: [], idx: 0 }
globalThis.window = {
  __ModuleLoader__: { load: (cfg) => { captured = cfg } },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
}
globalThis.document = {
  body: { nodeType: 1, contains: () => false, dispatchEvent() {} },
  querySelector: () => null,
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { contains: () => false }, appendChild() {}, setAttribute() {}, remove() {} }),
  head: { appendChild() {} },
}
// apply() wires two effects that observe the sidebar, so these globals must exist.
globalThis.MutationObserver = class { observe() {} disconnect() {} }
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.fetch = async (url) => {
  if (String(url).includes('/dsh-session-manager/state')) return { ok: true, json: async () => stateJson }
  return { ok: true, json: async () => ({ ok: true }) }
}

const react = {
  // A tiny hook cell store, so the plugin's own state updates (setMeta from its
  // /state fetch) survive into the second render pass. Booleans are the "panel
  // open" / busy flags → forced true so the real Manager renders; 'all' is the
  // tab default → substituted per scenario.
  useState: (init) => {
    const i = rt.idx++
    if (i >= rt.cells.length) rt.cells[i] = init === 'all' ? rt.tab : (typeof init === 'boolean' ? true : init)
    return [rt.cells[i], (v) => { rt.cells[i] = typeof v === 'function' ? v(rt.cells[i]) : v }]
  },
  useEffect: (fn) => { rt.effects.push(fn) },
  useCallback: (fn) => fn,
  // Render-through: a function element is invoked so component bodies really run.
  // Children arrive as extra ARGUMENTS (h(type, props, a, b)), not inside props.
  createElement: (type, props, ...children) => {
    const merged = { ...(props || {}) }
    if (children.length) merged.children = children.length === 1 ? children[0] : children
    return typeof type === 'function' ? type(merged) : { type, props: merged }
  },
  Fragment: Symbol('Fragment'),
}

// ── load the real bundle and wire it ────────────────────────────────────────
let Component
try {
  await import(pathToFileURL(CLIENT).href + '?smoke=' + Date.now())
  check('load: bundle registered through window.__ModuleLoader__', !!captured, captured?.id ?? '')
  const mod = captured?.factory((id) => (id === 'react' ? react : {}))
  check('factory: materialized with stubbed require()', typeof mod?.apply === 'function')
  const regs = []
  mod.apply({
    inject: (deps, cb) => cb({
      slots: { inject: (key, cb2) => cb2(), register: (opts, comp) => { regs.push({ opts, comp }); return () => {} } },
      workspaces: {},
      sessions: {},
    }),
    effect: (fn) => fn(),
  })
  check('apply: registered the sidebar entry', regs[0]?.opts?.id === 'dsh-session-manager-entry', JSON.stringify(regs[0]?.opts))
  Component = regs[0]?.comp
  check('apply: registration carries a renderable component', typeof Component === 'function')
} catch (error) {
  check('load + apply chain', false, String(error?.message ?? error))
}

/** Walk a stubbed render tree and collect every text node. */
function textOf(node, out = []) {
  if (node === null || node === undefined || node === false) return out
  if (Array.isArray(node)) { for (const item of node) textOf(item, out); return out }
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out }
  if (typeof node === 'object' && node.props) textOf(node.props.children, out)
  return out
}

async function render(tab) {
  rt.tab = tab
  rt.cells = []
  const props = {
    wide: true,
    useSessions: (selector) => selector(sessionsSnap),
    useWorkspaces: (selector) => selector({ archivedSessionIds: [] }),
  }
  const pass = () => {
    rt.idx = 0
    rt.effects = []
    const tree = Component(props)
    for (const fn of rt.effects) fn()
    return tree
  }
  pass()
  await new Promise((resolve) => setTimeout(resolve, 0)) // let the /state fetch settle
  return textOf(pass()).join('\u0000') // second pass: hooks now see the fetched meta
}

// ── scenario 1: the "全部" tab shows parents only ───────────────────────────
{
  stateJson = { sessions: {}, categories: ['default'], trash: {}, categoryStyles: {} }
  const text = await render('all')
  check('全部: shows parent 甲', text.includes(PARENT_A.displayTitle))
  check('全部: shows parent 乙', text.includes(PARENT_B.displayTitle))
  check('全部: hides the subagent declared by origin', !text.includes(SUB_BY_ORIGIN.displayTitle))
  check('全部: hides the subagent declared by parentId only', !text.includes(SUB_BY_PARENTID.displayTitle))
  check('全部: the counter counts parents only', text.includes('2 个会话'), text.match(/\d+ 个会话/)?.[0] ?? '(none)')
}

// ── scenario 2: legacy trash rows that happen to be subagents stay hidden ───
{
  // A pre-upgrade state file could hold child ids in `trash` (children used to be
  // visible). They must not leak back into the UI.
  stateJson = {
    sessions: { [PARENT_B.id]: { title: '乙(已删)' }, [SUB_BY_ORIGIN.id]: { title: '子(已删)' } },
    categories: ['default'],
    trash: { [PARENT_B.id]: 1, [SUB_BY_ORIGIN.id]: 2 },
    categoryStyles: {},
  }
  const text = await render('trash')
  check('回收站: shows the trashed parent', text.includes('乙(已删)'))
  check('回收站: hides a legacy trashed subagent row', !text.includes('子(已删)') && !text.includes(SUB_BY_ORIGIN.displayTitle))
  check('回收站: the counter counts visible rows only', text.includes('1 个会话'), text.match(/\d+ 个会话/)?.[0] ?? '(none)')
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS${failed.length ? ` — ${failed.length} FAIL` : ''}`)
process.exit(failed.length ? 1 : 0)
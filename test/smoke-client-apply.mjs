/**
 * session-manager × DSH 0.1.6-alpha.2 — client-half apply smoke + contract assertion.
 *
 * Verifies three things without a browser:
 *   1. CONTRACT: the installed 0.1.6 declarations really dropped
 *      `ISessions.open/openSubagent/clear` and `SessionListState.current`,
 *      and still expose `retain/using/retainInfo/refresh`.
 *   2. SOURCE: the fixed plugin bundle holds no live reference to any of them
 *      (comments excluded).
 *   3. APPLY: the bundle materializes through a stubbed
 *      `window.__ModuleLoader__` and `apply()` wires the sidebar entry and both
 *      effects without throwing.
 *
 * Usage: node test/smoke-client-apply.mjs [path-to-client.js]
 * Needs DSH_HOME pointing at the 0.1.6-alpha.2 install (it reads that version's
 * declarations to prove what the contract dropped).
 * Default target is this repo's own ../lib/client.js.
 * Exit: 0 = all PASS, 1 = at least one FAIL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const HOME = process.env.DSH_HOME
if (!HOME) { console.error('DSH_HOME is not set'); process.exit(1) }

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLIENT = process.argv[2] ?? path.join(HERE, '..', 'lib', 'client.js')

// ── locate the installed client session contract ────────────────────────────
function findContract() {
  const store = path.join(HOME, '..', '..', 'versions', '0.1.6-alpha.2', 'node_modules', '.pnpm')
  const roots = fs.existsSync(store) ? [store] : []
  for (const root of roots) {
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      const pkg = path.join(root, d.name, 'node_modules', '@deepseek-ai', 'dsh-api-session-controller', 'lib', 'types', 'client')
      if (fs.existsSync(path.join(pkg, 'contract', 'sessions.d.ts'))) return pkg
    }
  }
  return undefined
}

const results = []
const check = (step, ok, detail = '') => { results.push({ step, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? '  — ' + detail : ''}`) }

// ── 1. contract assertion against the installed declarations ────────────────
const contractDir = findContract()
if (!contractDir) {
  check('contract: locate @deepseek-ai/dsh-api-session-controller declarations', false, 'not found under versions/0.1.6-alpha.2')
} else {
  const sessions = fs.readFileSync(path.join(contractDir, 'contract', 'sessions.d.ts'), 'utf8')
  const service = fs.readFileSync(path.join(contractDir, 'sessions', 'service.d.ts'), 'utf8')
  const iface = /export interface ISessions \{([\s\S]*?)\n\}/.exec(sessions)?.[1] ?? ''
  const listIf = /export interface SessionListState \{([\s\S]*?)\n\}/.exec(service)?.[1] ?? ''
  for (const gone of ['open', 'openSubagent', 'clear']) {
    const hit = new RegExp(`\\b${gone}\\s*\\(`).test(iface)
    check(`contract: ISessions dropped \`${gone}\``, !hit)
  }
  for (const kept of ['retain', 'using', 'retainInfo', 'refresh']) {
    const hit = new RegExp(`\\b${kept}\\s*(?:<[^>]*>)?\\s*\\(`).test(iface)
    check(`contract: ISessions still exposes \`${kept}\``, hit)
  }
  const hasCurrent = /^\s*(?:readonly\s+)?current\s*[?:]/m.test(listIf)
  check('contract: SessionListState has no `current` field', !hasCurrent)
  for (const f of ['ids', 'byId', 'phase']) {
    check(`contract: SessionListState still has \`${f}\``, new RegExp(`^\\s*(?:readonly\\s+)?${f}\\s*[?:]`, 'm').test(listIf))
  }
}

// ── 2. source assertion (comments stripped) ─────────────────────────────────
const src = fs.readFileSync(CLIENT, 'utf8')
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
check('source: no live `sessionsApi.clear`', !/sessionsApi\.clear\b/.test(code))
check('source: no live `.getSnapshot().current`', !/getSnapshot\(\)\.current/.test(code))
check('source: no live `sessionsSnap.current`', !/sessionsSnap\.current/.test(code))
check('source: keeps `sessionsApi.refresh`', /sessionsApi\.refresh/.test(code))

// ── 3. real load → factory → apply ─────────────────────────────────────────
let captured
globalThis.window = {
  __ModuleLoader__: { load: (cfg) => { captured = cfg } },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
}
globalThis.document = {
  body: { nodeType: 1, contains: () => false, dispatchEvent() {} },
  querySelector: () => null,
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: {}, classList: { contains: () => false }, appendChild() {}, setAttribute() {}, remove() {} }),
}
globalThis.MutationObserver = class { observe() {} disconnect() {} }
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0)
globalThis.fetch = async () => ({ json: async () => ({}) })

try {
  await import(pathToFileURL(CLIENT).href + '?smoke=' + Date.now())
  check('load: bundle registered through window.__ModuleLoader__', !!captured, captured?.id ?? '')
} catch (error) {
  check('load: bundle registered through window.__ModuleLoader__', false, String(error?.message ?? error))
}

if (captured) {
  const primitives = new Proxy({}, { get: () => () => null })
  const reactStub = {
    useState: (v) => [v, () => {}], useEffect: () => {}, useRef: (v) => ({ current: v }),
    useMemo: (f) => f(), useCallback: (f) => f, createElement: () => null, Fragment: {},
  }
  let mod
  try {
    mod = captured.factory((id) => (id === 'react' ? reactStub : id.includes('primitives') ? primitives : {}))
    check('factory: materialized with stubbed require()', typeof mod?.apply === 'function')
  } catch (error) {
    check('factory: materialized with stubbed require()', false, String(error?.message ?? error))
  }

  if (typeof mod?.apply === 'function') {
    const regs = []
    const injections = []
    const effects = []
    const scope = {
      slots: {
        inject(key, cb) { injections.push(key); return cb() },
        register(opts) { regs.push(opts); return () => {} },
      },
      workspaces: { archiveSession: async () => {}, refresh: undefined },
      sessions: { refresh: async () => {} },
      get: () => undefined,
    }
    const ctx = {
      inject(deps, cb) {
        for (const d of deps) if (!(d in scope) && d !== 'slots' && d !== 'workspaces' && d !== 'sessions') throw new Error(`unexpected dep ${d}`)
        return cb(scope)
      },
      effect(fn, label) { const dispose = fn(); effects.push({ label, dispose }); return dispose },
    }
    try {
      mod.apply(ctx)
      check('apply: ran without throwing', true)
    } catch (error) {
      check('apply: ran without throwing', false, String(error?.message ?? error))
    }
    check('apply: injected sidebar.footer.action', injections.includes('sidebar.footer.action'), injections.join(','))
    const entry = regs.find((r) => r.id === 'dsh-session-manager-entry')
    check('apply: registered sidebar entry `dsh-session-manager-entry`', !!entry)
    check('apply: entry order = -30', entry?.order === -30, String(entry?.order))
    check('apply: both ctx.effect resources registered', effects.length === 2, effects.map((e) => e.label).join(' | '))
    check('apply: every effect disposer is callable', effects.every((e) => typeof e.dispose === 'function'))
  }
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS${failed.length ? ` — ${failed.length} FAIL` : ''}`)
process.exit(failed.length ? 1 : 0)
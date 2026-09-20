/**
 * dsh-session-manager × DSH 0.1.6-alpha.2 — host cascade smoke.
 *
 * The contract under test: "subagent" is invisible in daily use, so every
 * mutating action on a parent session must cover its WHOLE subtree on the host,
 * from the authoritative lineage (sessionQuery.listSessions → header.origin /
 * header.parentSession) — not from the client's list snapshot.
 *
 * What this drives for real:
 *   - the plugin's own `apply(ctx)` (stub ctx: webServer / sessionQuery /
 *     workspaceRegistry / sessions),
 *   - the real POST /dsh-session-manager/metadata handler, with body parsing,
 *     origin trust check and state file I/O on a throwaway DSH_HOME,
 *   - real filesystem effects (log dirs and projection-cache rows get deleted).
 *
 * Usage: node test/smoke-cascade-actions.mjs [path-to-host-index.js]
 * Exit: 0 = all PASS, 1 = at least one FAIL.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

// ── throwaway DSH_HOME (must exist BEFORE the module is imported) ───────────
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-cascade-'))
process.env.DSH_HOME = HOME

const ROOT = 'session-root'
const CHILD_A = 'child-a'
const CHILD_B = 'child-b'
const GRANDCHILD = 'grandchild-a'
const OTHER = 'session-other'

const areaDir = path.join(HOME, 'sessions', '--D-test--')
const cacheDir = path.join(HOME, 'storages', 'session_projcache', 'sessions')
fs.mkdirSync(path.join(HOME, 'profiles', 'web'), { recursive: true })
fs.mkdirSync(cacheDir, { recursive: true })
for (const id of [ROOT, CHILD_A, CHILD_B, GRANDCHILD, OTHER]) {
  fs.mkdirSync(path.join(areaDir, id), { recursive: true })
  fs.writeFileSync(path.join(areaDir, id, 'session.v3.jsonl.zstd'), 'stub-log')
  fs.writeFileSync(path.join(cacheDir, `${id}.json`), '{}')
}
const logExists = (id) => fs.existsSync(path.join(areaDir, id, 'session.v3.jsonl.zstd'))
const cacheExists = (id) => fs.existsSync(path.join(cacheDir, `${id}.json`))

// ── stub host services ─────────────────────────────────────────────────────
const lineage = [
  { header: { id: ROOT } },
  { header: { id: CHILD_A, origin: 'subagent', parentSession: ROOT } },
  { header: { id: CHILD_B, origin: 'subagent', parentSession: ROOT } },
  { header: { id: GRANDCHILD, origin: 'subagent', parentSession: CHILD_A } },
  { header: { id: OTHER } },
]
const corpusIds = new Set(lineage.map((r) => r.header.id))
const live = new Set()
let withSessionQuery = true

const archived = new Set()
const registryState = { archivedSessionIds: [] }
const registry = {
  async enqueueOperation(fn) { return fn() },
  requireState: () => registryState,
  async setState(next) { Object.assign(registryState, next) },
  list: () => [],
  async archiveSession(id) {
    // mirrors the real workspaceRegistry: an unknown session throws
    if (!corpusIds.has(id)) throw new Error(`unknown session ${id}`)
    archived.add(id)
    if (!registryState.archivedSessionIds.includes(id)) registryState.archivedSessionIds.push(id)
  },
}
const sessionQuery = { listSessions: async () => lineage }

let route
const ctx = {
  inject(deps, cb) { return cb({ webServer: { register(r) { route = r; return () => {} } } }) },
  effect(fn) { return fn() },
  get(name) {
    if (name === 'workspaceRegistry') return registry
    if (name === 'sessions') return { get: (id) => (live.has(id) ? { id } : undefined) }
    if (name === 'sessionQuery') return withSessionQuery ? sessionQuery : undefined
    return undefined
  },
}

// ── import the real plugin and apply it ────────────────────────────────────
const HERE = path.dirname(fileURLToPath(import.meta.url))
const HOST = process.argv[2] ?? path.join(HERE, '..', 'lib', 'index.js')
const mod = await import(pathToFileURL(HOST).href + '?smoke=' + Date.now())
mod.apply(ctx)

const results = []
const check = (step, ok, detail = '') => { results.push({ step, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? '  — ' + detail : ''}`) }
check('apply(): registered the metadata route', route?.path === '/dsh-session-manager/metadata', route?.path ?? '(none)')

async function post(body) {
  let status = 0
  let text = ''
  const req = {
    method: 'POST',
    headers: { host: '127.0.0.1:59999', origin: 'http://127.0.0.1:59999' },
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)) },
  }
  const res = { writeHead(code) { status = code }, end(chunk) { text = chunk ?? '' } }
  await route.handler(req, res)
  return { status, json: text === '' ? null : JSON.parse(text) }
}
const readState = () => JSON.parse(fs.readFileSync(path.join(HOME, 'profiles', 'web', 'dsh-session-manager.json'), 'utf8'))
const resetInvariants = () => { archived.clear(); registryState.archivedSessionIds.length = 0 }

// ── 1. archive cascades through the whole subtree ──────────────────────────
{
  resetInvariants()
  const r = await post({ action: 'archive', ids: [ROOT] })
  const expect = [ROOT, CHILD_A, CHILD_B, GRANDCHILD].every((id) => archived.has(id))
  check('archive(parent): archives parent + children + grandchild', r.status === 200 && expect, `archived=[${[...archived].join(',')}]`)
  check('archive(parent): leaves an unrelated session untouched', !archived.has(OTHER))
}

// ── 2. trash records only the parent, but archives the subtree ─────────────
{
  resetInvariants()
  const r = await post({ action: 'trash', ids: [ROOT], sessions: { [ROOT]: { title: 'root-title', cwd: 'D:\\x' } } })
  const state = readState()
  check('trash(parent): state.trash holds ONLY the parent', r.status === 200 && Object.keys(state.trash).length === 1 && state.trash[ROOT] !== undefined, JSON.stringify(Object.keys(state.trash)))
  check('trash(parent): subtree got archived anyway', [ROOT, CHILD_A, CHILD_B, GRANDCHILD].every((id) => archived.has(id)))
}

// ── 3. untrash restores the subtree ───────────────────────────────────────
{
  const r = await post({ action: 'untrash', ids: [ROOT] })
  const state = readState()
  const cleared = [ROOT, CHILD_A, CHILD_B, GRANDCHILD].every((id) => !registryState.archivedSessionIds.includes(id))
  check('untrash(parent): restores parent + subtree', r.status === 200 && cleared, `archivedSessionIds=[${registryState.archivedSessionIds.join(',')}]`)
  check('untrash(parent): drops the parent from state.trash', Object.keys(state.trash).length === 0)
}

// ── 4. purge deletes the subtree's log + cache rows for real ───────────────
{
  resetInvariants()
  const r = await post({ action: 'purge', ids: [ROOT] })
  const gone = [ROOT, CHILD_A, CHILD_B, GRANDCHILD].every((id) => !logExists(id) && !cacheExists(id))
  check('purge(parent): deletes log + projection cache of the whole subtree', r.status === 200 && gone)
  check('purge(parent): leaves the unrelated session on disk', logExists(OTHER) && cacheExists(OTHER))
}

// ── 5. a LIVE descendant is deferred, not destroyed ───────────────────────
{
  // rebuild what purge removed, then mark one grandchild live
  for (const id of [ROOT, CHILD_A, CHILD_B, GRANDCHILD]) {
    fs.mkdirSync(path.join(areaDir, id), { recursive: true })
    fs.writeFileSync(path.join(areaDir, id, 'session.v3.jsonl.zstd'), 'stub-log')
    fs.writeFileSync(path.join(cacheDir, `${id}.json`), '{}')
  }
  live.add(GRANDCHILD)
  const r = await post({ action: 'purge', ids: [ROOT] })
  const state = readState()
  check('purge(parent) with a live descendant: descendant is deferred', r.status === 200 && state.pendingPurge[GRANDCHILD] !== undefined, JSON.stringify(Object.keys(state.pendingPurge)))
  check('purge(parent) with a live descendant: its log survives', logExists(GRANDCHILD) && cacheExists(GRANDCHILD))
  check('purge(parent) with a live descendant: the cold parent is still deleted', !logExists(ROOT) && !cacheExists(ROOT))
  live.delete(GRANDCHILD)
}

// ── 6. degrade path: no sessionQuery ⇒ operate on the given ids only ───────
{
  withSessionQuery = false
  for (const id of [ROOT, CHILD_A]) {
    fs.mkdirSync(path.join(areaDir, id), { recursive: true })
    fs.writeFileSync(path.join(areaDir, id, 'session.v3.jsonl.zstd'), 'stub-log')
  }
  resetInvariants()
  const r = await post({ action: 'archive', ids: [ROOT] })
  check('no sessionQuery: still archives the requested id', r.status === 200 && archived.has(ROOT))
  check('no sessionQuery: does not invent descendants', !archived.has(CHILD_A) && !archived.has(GRANDCHILD))
  withSessionQuery = true
}

// ── 7. an unknown id must not derail the batch ────────────────────────────
{
  resetInvariants()
  const r = await post({ action: 'archive', ids: [ROOT, 'ghost-session'] })
  check('one unknown id does not abort the batch', r.status === 200 && archived.has(ROOT) && [CHILD_A, CHILD_B, GRANDCHILD].every((id) => archived.has(id)), `archived=[${[...archived].join(',')}]`)
}

fs.rmSync(HOME, { recursive: true, force: true })
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS${failed.length ? ` — ${failed.length} FAIL` : ''}`)
process.exit(failed.length ? 1 : 0)
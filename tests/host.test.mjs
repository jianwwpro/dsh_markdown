/**
 * Host route tests: drive the registered exact Fetch route with a fake
 * Cordis context and a filesystem provider backed by a temporary directory.
 * Run with: ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE" tests/host.test.mjs
 */
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { apply } from '../index.js'

const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-md-editor-'))

/** One provider-shaped failure. */
function fsError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

/** Stable version string for the fake provider. */
function versionOf(info) {
  return `${info.mtimeMs}-${info.size}`
}

/** A provider-shaped filesystem over the real local disk. */
const fakeFs = {
  async resolve(targetPath) {
    const absolute = path.resolve(targetPath)
    // Mirror the provider: realpath the target, or for a missing leaf realpath
    // the nearest existing ancestor and re-append the missing suffix.
    let current = absolute
    const suffix = []
    for (;;) {
      try {
        const real = await realpath(current)
        return { targetKey: path.join(real, ...suffix.reverse()), displayPath: absolute }
      } catch {
        const parent = path.dirname(current)
        if (parent === current) return { targetKey: absolute, displayPath: absolute }
        suffix.push(path.basename(current))
        current = parent
      }
    }
  },
  contains(parent, child) {
    return child.targetKey === parent.targetKey
      || child.targetKey.startsWith(`${parent.targetKey}${path.sep}`)
  },
  async stat(target) {
    try {
      const info = await stat(target.targetKey)
      return {
        version: versionOf(info),
        type: info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'other',
        size: info.size,
      }
    } catch {
      return undefined
    }
  },
  async listDir(target) {
    const entries = await readdir(target.targetKey, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    return entries.map(entry => {
      const absolute = path.join(target.targetKey, entry.name)
      return {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
        target: { targetKey: absolute, displayPath: absolute },
      }
    })
  },
  async readText(target) {
    return readFile(target.targetKey, 'utf8')
  },
  async writeText(target, content, expected) {
    let info
    let exists = true
    try {
      info = await stat(target.targetKey)
    } catch {
      exists = false
    }
    if (expected && expected.kind === 'createIfAbsent' && exists) throw fsError('FS_ALREADY_EXISTS')
    if (expected && expected.kind === 'replaceIfVersion') {
      if (!exists || versionOf(info) !== expected.version) throw fsError('FS_STALE_VERSION')
    }
    try {
      await writeFile(target.targetKey, content, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw fsError('FS_NOT_FOUND')
      throw error
    }
    const after = await stat(target.targetKey)
    return { operation: exists ? 'update' : 'create', version: versionOf(after), before: null, after: content }
  },
}

/** The registered workspace. */
const registry = {
  list: () => [{ id: 'w1', title: 'Test workspace', path: root }],
}

/**
 * Install the Host half over a fake context.
 * @param {{readOnly?: boolean, fs?: object, registry?: object}} options - overrides.
 * @returns {Promise<object>} the route plus a request helper.
 */
function install(options = {}) {
  const routes = []
  const services = {
    fs: Object.hasOwn(options, 'fs') ? options.fs : fakeFs,
    workspaceRegistry: Object.hasOwn(options, 'registry') ? options.registry : registry,
    sandboxPolicy: { defaultMode: options.readOnly === true ? 'read-only' : 'workspace-write' },
  }
  apply({
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return async () => {}
        },
      },
    },
    get: name => services[name],
  })
  assert.equal(routes.length, 1, 'the Host half registers exactly one route')
  const route = routes[0]
  assert.equal(route.path, '/api/markdown-editor')
  return {
    route,
    async get(query) {
      const response = await route.fetch(new Request(`http://localhost/api/markdown-editor?${query}`))
      return { status: response.status, body: await response.json() }
    },
    async post(payload) {
      const response = await route.fetch(new Request('http://localhost/api/markdown-editor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }))
      return { status: response.status, body: await response.json() }
    },
  }
}

await mkdir(path.join(root, 'docs'), { recursive: true })
await mkdir(path.join(root, 'node_modules', 'pkg'), { recursive: true })
await writeFile(path.join(root, 'README.md'), '# Hello\n')
await writeFile(path.join(root, 'docs', 'guide.md'), '# Guide\n\nBody.\n')
await writeFile(path.join(root, 'docs', 'notes.txt'), 'nope\n')
await writeFile(path.join(root, 'node_modules', 'pkg', 'readme.md'), '# hidden\n')

const api = install()

// Workspace discovery.
{
  const { status, body } = await api.get('op=workspaces')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  assert.deepEqual(body.workspaces, [{ id: 'w1', title: 'Test workspace', path: root }])
  assert.equal(body.readOnly, false)
}

// Markdown scan: includes nested Markdown, skips non-Markdown and node_modules.
{
  const { status, body } = await api.get('op=files&workspace=w1')
  assert.equal(status, 200)
  assert.deepEqual(body.files.map(file => file.path), ['README.md', 'docs/guide.md'])
  assert.equal(body.truncated, false)
}

// A Markdown symlink resolving outside the workspace is not listed.
{
  const outside = await mkdtemp(path.join(os.tmpdir(), 'dsh-md-outside-'))
  await writeFile(path.join(outside, 'escape.md'), '# Outside\n')
  await symlink(path.join(outside, 'escape.md'), path.join(root, 'escape.md'))
  const { body } = await api.get('op=files&workspace=w1')
  assert.ok(!body.files.some(file => file.path === 'escape.md'))
  const read = await api.get('op=file&workspace=w1&path=escape.md')
  assert.equal(read.status, 400, JSON.stringify(read.body))
  assert.equal(read.body.error.code, 'invalid-path')
  await rm(outside, { recursive: true, force: true })
}

// Read one document.
let readVersion
{
  const { status, body } = await api.get('op=file&workspace=w1&path=docs%2Fguide.md')
  assert.equal(status, 200)
  assert.equal(body.content, '# Guide\n\nBody.\n')
  assert.equal(typeof body.version, 'string')
  readVersion = body.version
}

// Saving with the current version succeeds.
{
  const { status, body } = await api.post({
    op: 'save', workspace: 'w1', path: 'docs/guide.md', content: '# Guide v2\n', version: readVersion,
  })
  assert.equal(status, 200, JSON.stringify(body))
  assert.equal(body.ok, true)
  assert.equal(await readFile(path.join(root, 'docs', 'guide.md'), 'utf8'), '# Guide v2\n')
}

// Saving with a stale version reports a conflict and leaves the file intact.
{
  const { status, body } = await api.post({
    op: 'save', workspace: 'w1', path: 'docs/guide.md', content: '# Clobber\n', version: readVersion,
  })
  assert.equal(status, 409, JSON.stringify(body))
  assert.equal(body.error.code, 'stale')
  assert.equal(await readFile(path.join(root, 'docs', 'guide.md'), 'utf8'), '# Guide v2\n')
}

// Forced overwrite replaces the document.
{
  const { status, body } = await api.post({
    op: 'save', workspace: 'w1', path: 'docs/guide.md', content: '# Forced\n', version: readVersion, force: true,
  })
  assert.equal(status, 200, JSON.stringify(body))
  assert.equal(await readFile(path.join(root, 'docs', 'guide.md'), 'utf8'), '# Forced\n')
}

// Create a new document, then refuse to recreate it.
{
  const created = await api.post({
    op: 'create', workspace: 'w1', path: 'docs/new.md', content: '# New\n',
  })
  assert.equal(created.status, 200, JSON.stringify(created.body))
  assert.equal(created.body.path, 'docs/new.md')
  assert.equal(await readFile(path.join(root, 'docs', 'new.md'), 'utf8'), '# New\n')
  const duplicate = await api.post({
    op: 'create', workspace: 'w1', path: 'docs/new.md', content: '# Again\n',
  })
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body))
  assert.equal(duplicate.body.error.code, 'exists')
}

// Creating inside a missing directory names the broken prerequisite.
{
  const { status, body } = await api.post({
    op: 'create', workspace: 'w1', path: 'missing/new.md', content: '# New\n',
  })
  assert.equal(status, 404, JSON.stringify(body))
  assert.equal(body.error.code, 'missing-parent')
}

// Path and extension fences.
{
  const traversal = await api.get('op=file&workspace=w1&path=..%2Foutside.md')
  assert.equal(traversal.status, 400)
  assert.equal(traversal.body.error.code, 'invalid-path')

  const absolute = await api.get(`op=file&workspace=w1&path=${encodeURIComponent('/etc/passwd')}`)
  assert.equal(absolute.status, 400)

  const notMarkdown = await api.post({
    op: 'save', workspace: 'w1', path: 'docs/notes.txt', content: 'x', version: null,
  })
  assert.equal(notMarkdown.status, 415)
  assert.equal(notMarkdown.body.error.code, 'not-text')
}

// Unknown operations and invalid bodies.
{
  assert.equal((await api.get('op=wat&workspace=w1')).status, 404)
  assert.equal((await api.post({ op: 'nope' })).status, 400)
  assert.equal((await api.post({ op: 'save', workspace: 'w1', path: 'README.md', content: 1 })).status, 400)
}

// A read-only deployment refuses writes before touching the provider.
{
  const restricted = install({ readOnly: true })
  const listed = await restricted.get('op=files&workspace=w1')
  assert.equal(listed.body.readOnly, true)
  const rejected = await restricted.post({
    op: 'save', workspace: 'w1', path: 'docs/new.md', content: '# No\n', version: null,
  })
  assert.equal(rejected.status, 403, JSON.stringify(rejected.body))
  assert.equal(rejected.body.error.code, 'read-only')
}

// A profile without the filesystem service reports itself unavailable.
{
  const unavailable = install({ fs: undefined })
  const { status, body } = await unavailable.get('op=workspaces')
  assert.equal(status, 503)
  assert.equal(body.error.code, 'unavailable')
}

await rm(root, { recursive: true, force: true })
console.log('host route tests passed')

/**
 * Host half of the Markdown editor bundle.
 *
 * The browser half cannot touch the filesystem, so this half owns every read
 * and write. It publishes one authenticated exact Fetch route on the shared
 * `/api` channel (`ctx.connection.fetch`), which reaches the Web page only
 * through the Connection carrier: the carrier applies its Host/Origin and
 * browser-session policy first, and answers 403 for every non-owner Peer. The
 * route therefore carries no second authentication scheme of its own.
 *
 * All paths are workspace-relative, must end in a Markdown extension, and are
 * fenced twice: lexical containment under the registered workspace directory,
 * then the composed filesystem provider's own `contains` check on resolved
 * targets. Writes carry the deployment sandbox mode and the selected
 * workspace as their `workspace-write` root, so a read-only deployment refuses
 * them.
 */
import path from 'node:path'

/** The one route this bundle owns below `/api`. */
const ROUTE_PATH = '/api/markdown-editor'

/** Largest document the editor reads, writes, or previews in one call. */
const MAX_FILE_BYTES = 2 * 1024 * 1024

/** Bound on one recursive workspace scan. */
const MAX_FILES = 500

/** Bound on directory nesting during a workspace scan. */
const MAX_DEPTH = 8

/** Files the editor treats as Markdown. */
const MARKDOWN_FILE = /\.(?:md|markdown|mdx)$/i

/**
 * Directories a workspace scan never descends into: build output, caches, and
 * version-control or editor metadata hold no document the editor should own.
 */
const SKIP_DIRECTORIES = new Set([
  'node_modules', '.git', '.hg', '.svn', '.next', '.nuxt', '.cache', '.turbo',
  '.venv', 'venv', '__pycache__', '.obsidian', '.idea', '.vscode',
  'dist', 'build', 'out', 'coverage', 'target', 'vendor',
])

/** The Connection service is required; every other Host service is looked up per call. */
export const inject = ['connection']

/**
 * Register the editor's Host API route.
 * @param ctx - the plugin context carrying `connection`.
 */
export function apply(ctx) {
  // `register` is itself an effect of this context, so unloading the plugin
  // removes the route.
  ctx.connection.fetch.register({
    path: ROUTE_PATH,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: request => handleRequest(ctx, request),
  })
}

/**
 * Dispatch one API request.
 * @param ctx - plugin context.
 * @param request - the request admitted by the Connection carrier.
 * @returns JSON response.
 */
async function handleRequest(ctx, request) {
  try {
    const url = new URL(request.url)
    if (request.method === 'GET') return await handleRead(ctx, url, request.signal)
    if (request.method === 'POST') return await handleWrite(ctx, request, request.signal)
    return fail(new ApiError(405, 'method', 'unsupported method'))
  } catch (error) {
    return fail(error)
  }
}

/**
 * Handle a read operation.
 * @param ctx - plugin context.
 * @param url - request URL whose query names the operation.
 * @param signal - caller cancellation.
 * @returns JSON response.
 */
async function handleRead(ctx, url, signal) {
  const services = resolveServices(ctx)
  const operation = url.searchParams.get('op') ?? 'workspaces'
  if (operation === 'workspaces') {
    const workspaces = services.registry.list().map(workspace => ({
      id: String(workspace.id),
      title: workspace.title,
      path: workspace.path,
    }))
    return json({
      ok: true,
      workspaces,
      readOnly: deploymentMode(services.policy) === 'read-only',
    })
  }
  const workspace = pickWorkspace(services.registry, url.searchParams.get('workspace'))
  if (operation === 'files') {
    const files = await scanWorkspace(services.fs, workspace, signal)
    return json({
      ok: true,
      files: files.files,
      truncated: files.truncated,
      readOnly: deploymentMode(services.policy) === 'read-only',
      workspace: { id: String(workspace.id), title: workspace.title, path: workspace.path },
    })
  }
  if (operation === 'file') {
    const document = await readDocument(services.fs, workspace, url.searchParams.get('path'), signal)
    return json({
      ok: true,
      path: document.path,
      content: document.content,
      version: document.version,
      size: document.size,
      readOnly: deploymentMode(services.policy) === 'read-only',
    })
  }
  throw new ApiError(404, 'unknown-op', `unknown read operation ${JSON.stringify(operation)}`)
}

/**
 * Handle one write operation.
 * @param ctx - plugin context.
 * @param request - request carrying a JSON body.
 * @param signal - caller cancellation.
 * @returns JSON response.
 */
async function handleWrite(ctx, request, signal) {
  const services = resolveServices(ctx)
  const body = await readJsonBody(request)
  const operation = body.op
  if (operation !== 'save' && operation !== 'create') {
    throw new ApiError(400, 'unknown-op', 'the write operation must be save or create')
  }
  const workspace = pickWorkspace(services.registry, body.workspace)
  const relative = normalizeRelative(body.path)
  assertMarkdownPath(relative)
  if (typeof body.content !== 'string') throw new ApiError(400, 'invalid-body', 'content must be a string')
  if (Buffer.byteLength(body.content, 'utf8') > MAX_FILE_BYTES) {
    throw new ApiError(413, 'too-large', 'the document exceeds the editor size limit')
  }
  const policy = writePolicy(services.policy, workspace.path)
  if (policy.mode === 'read-only') {
    throw new ApiError(403, 'read-only', 'the deployment file policy is read-only')
  }
  const target = await resolveInside(services.fs, workspace.path, relative)

  if (operation === 'create') {
    let outcome
    try {
      outcome = await services.fs.writeText(
        target, body.content, { kind: 'createIfAbsent' }, signal, policy,
      )
    } catch (error) {
      const mapped = mapFsError(error, 'write-failed')
      // A create below a missing directory is a prerequisite failure, not a
      // vanished document: tell the editor which rule it broke.
      if (mapped.code === 'not-found') throw new ApiError(404, 'missing-parent', mapped.message)
      throw mapped
    }
    return json({
      ok: true,
      path: relative,
      version: String(outcome.version),
      size: Buffer.byteLength(body.content, 'utf8'),
      savedAt: Date.now(),
    })
  }

  let expected
  const forced = body.force === true
  if (!forced) {
    if (typeof body.version === 'string' && body.version !== '') {
      expected = { kind: 'replaceIfVersion', version: body.version }
    } else {
      const info = await attempt(() => services.fs.stat(target, signal), 'read-failed')
      if (info === undefined) throw new ApiError(404, 'not-found', 'the file does not exist')
      expected = { kind: 'replaceIfVersion', version: info.version }
    }
  }
  const outcome = await attempt(() => services.fs.writeText(
    target, body.content, expected, signal, policy,
  ), 'write-failed')
  return json({
    ok: true,
    path: relative,
    version: String(outcome.version),
    size: Buffer.byteLength(body.content, 'utf8'),
    savedAt: Date.now(),
  })
}

/**
 * Read the Host services this bundle composes with.
 * @param ctx - plugin context.
 * @returns the required filesystem and workspace registry plus the optional policy service.
 */
function resolveServices(ctx) {
  const fs = ctx.get('fs')
  const registry = ctx.get('workspaceRegistry')
  if (fs === undefined) throw new ApiError(503, 'unavailable', 'the filesystem service is unavailable')
  if (registry === undefined) throw new ApiError(503, 'unavailable', 'the workspace registry is unavailable')
  return { fs, registry, policy: ctx.get('sandboxPolicy') }
}

/**
 * The deployment-wide file mode.
 * @param policy - optional sandbox-policy service.
 * @returns the mode writes start from.
 */
function deploymentMode(policy) {
  const mode = policy?.defaultMode
  return mode === 'read-only' || mode === 'danger-full-access' ? mode : 'workspace-write'
}

/**
 * Resolve the write policy for one workspace.
 * @param policy - optional sandbox-policy service.
 * @param workspacePath - the directory the write is fenced to.
 * @returns a complete per-call sandbox policy.
 */
function writePolicy(policy, workspacePath) {
  const mode = deploymentMode(policy)
  const additionalWritableRoots = policy?.additionalWritableRoots
  return {
    mode,
    workspaceRoot: workspacePath,
    ...(additionalWritableRoots === undefined ? {} : { additionalWritableRoots }),
  }
}

/**
 * Select one registered workspace.
 * @param registry - the workspace registry service.
 * @param id - requested workspace id, or null for the first registered workspace.
 * @returns the selected workspace.
 */
function pickWorkspace(registry, id) {
  const workspaces = registry.list()
  if (workspaces.length === 0) throw new ApiError(404, 'no-workspace', 'no workspace is registered')
  if (id === null || id === undefined || id === '') return workspaces[0]
  const found = workspaces.find(workspace => String(workspace.id) === id)
  if (found === undefined) throw new ApiError(404, 'no-workspace', `workspace ${JSON.stringify(id)} is not registered`)
  return found
}

/**
 * Normalize one workspace-relative path without touching the filesystem.
 * @param value - caller-supplied relative path.
 * @returns forward-slash relative path.
 */
function normalizeRelative(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, 'invalid-path', 'a document path is required')
  }
  if (value.includes('\0')) throw new ApiError(400, 'invalid-path', 'the path contains a NUL byte')
  const normalized = value.replace(/\\/g, '/')
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new ApiError(400, 'invalid-path', 'the path must be relative to the workspace')
  }
  const segments = normalized.split('/').filter(segment => segment !== '' && segment !== '.')
  if (segments.length === 0 || segments.some(segment => segment === '..')) {
    throw new ApiError(400, 'invalid-path', 'the path must stay inside the workspace')
  }
  return segments.join('/')
}

/**
 * Reject paths the editor does not own.
 * @param relative - normalized relative path.
 */
function assertMarkdownPath(relative) {
  if (!MARKDOWN_FILE.test(relative)) {
    throw new ApiError(415, 'not-text', 'the editor only opens Markdown files')
  }
}

/**
 * Resolve one relative path to a filesystem target fenced by the workspace.
 * @param fs - filesystem provider.
 * @param workspacePath - registered workspace directory.
 * @param relative - normalized relative path.
 * @returns the resolved target inside the workspace.
 */
async function resolveInside(fs, workspacePath, relative) {
  const root = path.resolve(workspacePath)
  const absolute = path.resolve(root, relative)
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
  if (absolute !== root && !absolute.startsWith(prefix)) {
    throw new ApiError(400, 'invalid-path', 'the path escapes the workspace')
  }
  let rootTarget
  let target
  try {
    rootTarget = await fs.resolve(root)
    target = await fs.resolve(absolute)
  } catch (error) {
    throw mapFsError(error, 'read-failed')
  }
  if (!fs.contains(rootTarget, target)) {
    throw new ApiError(400, 'invalid-path', 'the path escapes the workspace')
  }
  return target
}

/**
 * Scan a workspace for Markdown documents.
 * @param fs - filesystem provider.
 * @param workspace - selected workspace.
 * @param signal - caller cancellation.
 * @returns discovered files and whether a bound truncated the scan.
 */
async function scanWorkspace(fs, workspace, signal) {
  const files = []
  let truncated = false
  const root = await attempt(() => fs.resolve(workspace.path), 'read-failed')
  const visit = async (directory, prefix, depth) => {
    if (files.length >= MAX_FILES) { truncated = true; return }
    if (depth > MAX_DEPTH) { truncated = true; return }
    let entries
    try {
      entries = await fs.listDir(directory, signal)
    } catch (error) {
      if (depth === 0) throw mapFsError(error, 'read-failed')
      return
    }
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (files.length >= MAX_FILES) { truncated = true; return }
      if (entry.type === 'directory') {
        // A symlinked directory may resolve outside the workspace; never list
        // through it, even though reads and writes are fenced separately.
        if (SKIP_DIRECTORIES.has(entry.name) || !fs.contains(root, entry.target)) continue
        await visit(entry.target, prefix === '' ? entry.name : `${prefix}/${entry.name}`, depth + 1)
        continue
      }
      if (entry.type !== 'file' || !MARKDOWN_FILE.test(entry.name)) continue
      if (!fs.contains(root, entry.target)) continue
      files.push({
        path: prefix === '' ? entry.name : `${prefix}/${entry.name}`,
        size: entry.size ?? 0,
        version: entry.version === undefined ? undefined : String(entry.version),
      })
    }
  }
  await visit(root, '', 0)
  // Top-level documents first, then deeper paths alphabetically: a flat list
  // reads better when the workspace root is not buried under folders.
  files.sort((left, right) => {
    const depth = left.path.split('/').length - right.path.split('/').length
    return depth !== 0 ? depth : left.path.localeCompare(right.path)
  })
  return { files, truncated }
}

/**
 * Read one Markdown document.
 * @param fs - filesystem provider.
 * @param workspace - selected workspace.
 * @param requested - caller-supplied relative path.
 * @param signal - caller cancellation.
 * @returns path, text, version, and byte size.
 */
async function readDocument(fs, workspace, requested, signal) {
  const relative = normalizeRelative(requested)
  assertMarkdownPath(relative)
  const target = await resolveInside(fs, workspace.path, relative)
  const info = await attempt(() => fs.stat(target, signal), 'read-failed')
  if (info === undefined) throw new ApiError(404, 'not-found', 'the document does not exist')
  if (info.type !== 'file') throw new ApiError(415, 'not-text', 'the path is not a regular file')
  if ((info.size ?? 0) > MAX_FILE_BYTES) {
    throw new ApiError(413, 'too-large', 'the document exceeds the editor size limit')
  }
  const content = await attempt(() => fs.readText(target, signal), 'read-failed')
  return { path: relative, content, version: String(info.version), size: info.size ?? 0 }
}

/**
 * Read a JSON request body.
 * @param request - incoming request.
 * @returns parsed body.
 */
async function readJsonBody(request) {
  const text = await request.text()
  if (text === '') throw new ApiError(400, 'invalid-body', 'the request body is empty')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ApiError(400, 'invalid-body', 'the request body is not valid JSON')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError(400, 'invalid-body', 'the request body must be a JSON object')
  }
  return parsed
}

/**
 * Await one filesystem call and translate its failure.
 * @param operation - the call to run.
 * @param fallback - code for an untranslated failure.
 * @returns the call's value.
 */
async function attempt(operation, fallback) {
  try {
    return await operation()
  } catch (error) {
    throw mapFsError(error, fallback)
  }
}

/**
 * Translate a provider failure into an API error.
 * @param error - thrown failure.
 * @param fallback - code for an untranslated failure.
 * @returns the API error to report.
 */
function mapFsError(error, fallback) {
  if (error instanceof ApiError) return error
  const code = error?.code
  const message = error instanceof Error && error.message !== '' ? error.message : 'the filesystem operation failed'
  if (code === 'FS_STALE_VERSION') return new ApiError(409, 'stale', message)
  if (code === 'FS_ALREADY_EXISTS') return new ApiError(409, 'exists', message)
  if (code === 'FS_NOT_FOUND') return new ApiError(404, 'not-found', message)
  if (code === 'FS_NOT_REGULAR_FILE' || code === 'FS_NOT_TEXT') return new ApiError(415, 'not-text', message)
  if (code === 'FS_NOT_DIRECTORY') return new ApiError(400, 'invalid-path', message)
  if (code === 'FS_TOO_LARGE') return new ApiError(413, 'too-large', message)
  if (code === 'FS_PERMISSION_DENIED' || code === 'FS_SANDBOX_DENIED') return new ApiError(403, 'denied', message)
  if (code === 'FS_ABORTED') return new ApiError(499, 'aborted', message)
  return new ApiError(500, fallback, message)
}

/** One expected API failure with its HTTP status and machine code. */
class ApiError extends Error {
  /**
   * @param status - HTTP status.
   * @param code - stable machine code the Client localizes.
   * @param message - diagnostic text.
   */
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Serialize a value as a JSON response.
 * @param body - JSON value.
 * @param status - HTTP status.
 * @returns the response.
 */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Serialize one failure.
 * @param error - thrown failure.
 * @returns the error response.
 */
function fail(error) {
  const known = error instanceof ApiError ? error : mapFsError(error, 'read-failed')
  return json({ ok: false, error: { code: known.code, message: known.message } }, known.status)
}

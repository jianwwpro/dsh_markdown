/**
 * Client half tests: load the browser module with a window/module-loader and
 * React shim, then exercise the pure Markdown renderer through the module's
 * test seam. Run with:
 * ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE" tests/client.test.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8')
let registered
const windowShim = { __ModuleLoader__: { load: module => { registered = module } } }
// The browser module is a classic script that registers itself on window.
// eslint-disable-next-line no-new-func
new Function('window', source)(windowShim)
assert.equal(registered.id, '@local/dsh-markdown-editor')
assert.equal(typeof registered.factory, 'function')

const ReactStub = {
  createElement: () => null,
  Fragment: Symbol('Fragment'),
  useCallback: callback => callback,
  useEffect: () => undefined,
  useMemo: factory => factory(),
  useRef: value => ({ current: value }),
  useState: value => [typeof value === 'function' ? value() : value, () => undefined],
}
const module = registered.factory(name => {
  if (name === 'react') return ReactStub
  throw new Error(`unexpected module request: ${name}`)
})

assert.ok(Array.isArray(module.inject))
assert.equal(typeof module.apply, 'function')
assert.deepEqual(module.inject, ['slots', 'locale'])
assert.equal(typeof module.__test.renderMarkdown, 'function')

const { renderMarkdown, escapeHtml, fileAddressPath, workspaceRelativePath, pathInside } = module.__test

// Escaping.
assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')

// Headings, paragraphs, inline emphasis, and code spans.
{
  const html = renderMarkdown('# Title\n\nSome **bold**, *italic*, ~~gone~~ and `a < b`.\nSecond line.')
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<em>italic<\/em>/)
  assert.match(html, /<del>gone<\/del>/)
  assert.match(html, /<code>a &lt; b<\/code>/)
  assert.match(html, /<br>Second line\./)
}

// Raw HTML never becomes markup.
{
  const html = renderMarkdown('<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>')
  assert.ok(!html.includes('<img'))
  assert.ok(!html.includes('<script'))
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
}

// Fenced code blocks escape their content and keep the language label.
{
  const html = renderMarkdown('```ts\nconst x = "<b>"\n```')
  assert.match(html, /<pre class="dsh-md-code" data-lang="ts"><code>const x = &quot;&lt;b&gt;&quot;<\/code><\/pre>/)
}

// Lists, including tasks and ordered starts.
{
  const html = renderMarkdown('- [x] done\n- [ ] todo\n\n3. three\n4. four')
  assert.match(html, /<ul>/)
  assert.match(html, /dsh-md-taskbox is-checked/)
  assert.match(html, /<ol start="3">/)
  assert.match(html, /<li>four<\/li>/)
}

// Links: only inert schemes produce anchors.
{
  const safe = renderMarkdown('[docs](https://example.com/a?b=1&c=2)')
  assert.match(safe, /<a href="https:\/\/example\.com\/a\?b=1&amp;c=2" target="_blank" rel="noreferrer noopener">docs<\/a>/)
  const unsafe = renderMarkdown('[click](javascript:alert(1))')
  assert.ok(!unsafe.includes('href'))
  assert.ok(!unsafe.includes('<a '))
}

// Tables pick up alignment and inline formatting.
{
  const html = renderMarkdown('| Name | Count |\n| :--- | ---: |\n| **a** | 2 |')
  assert.match(html, /<table>/)
  assert.match(html, /text-align:left/)
  assert.match(html, /text-align:right/)
  assert.match(html, /<strong>a<\/strong>/)
}

// Block quotes recurse through the block renderer.
{
  const html = renderMarkdown('> ## Quoted\n> text')
  assert.match(html, /<blockquote><h2>Quoted<\/h2>/)
}

// Horizontal rules, images as placeholders, and empty input.
assert.equal(renderMarkdown('---'), '<hr>')
assert.match(renderMarkdown('![alt text](https://example.com/a.png)'), /<span class="dsh-md-image" title="https:\/\/example\.com\/a\.png">alt text<\/span>/)
assert.equal(renderMarkdown(''), '')
assert.equal(renderMarkdown(null), '')

// Document-tab address parsing and workspace relativization.
{
  assert.equal(fileAddressPath('dsh-resource://file/session/s1/docs/a%20b.md'), 'docs/a b.md')
  assert.equal(fileAddressPath('dsh-resource://file/session/s1/notes.md#L10'), 'notes.md')
  assert.equal(fileAddressPath('dsh-resource://file/absolute/Users/x/a.md'), '/Users/x/a.md')
  assert.equal(fileAddressPath('dsh-resource://file/absolute//server/share/a.md'), '//server/share/a.md')
  assert.equal(fileAddressPath('not-a-file-address'), null)

  assert.equal(workspaceRelativePath('/w/ws', 'docs/a.md'), 'docs/a.md')
  assert.equal(workspaceRelativePath('/w/ws/', './docs/a.md'), 'docs/a.md')
  assert.equal(workspaceRelativePath('/w/ws', '/w/ws/docs/a.md'), 'docs/a.md')
  assert.equal(workspaceRelativePath('/w/ws', '/w/other/a.md'), null)
  assert.equal(workspaceRelativePath('/w/ws', '/w/ws'), '')
  assert.equal(workspaceRelativePath('', 'docs/a.md'), null)

  assert.equal(pathInside('/w/ws', '/w/ws/docs/a.md'), true)
  assert.equal(pathInside('/w/ws/', '/w/ws'), true)
  assert.equal(pathInside('/w/ws', '/w/wsx/a.md'), false)
  assert.equal(pathInside('C:/Work/WS', 'c:/work/ws/a.md'), true)
  assert.equal(pathInside('', '/w/a.md'), false)
}

console.log('client renderer tests passed')

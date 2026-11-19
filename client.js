window.__ModuleLoader__.load({
  id: '@local/dsh-markdown-editor',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    /** This plugin's copy namespace. */
    const NS = 'markdownEditor'
    /** Panel id shared by the sidebar entry and the main panel. */
    const PANEL_ID = 'markdown-editor'
    /** The Host route this page talks to. */
    const API = '/api/markdown-editor'
    /** The document-tab viewer this bundle adds beside Markdown, Code, and Plain text. */
    const DOC_EDIT_ID = '@local/dsh-markdown-editor/document'
    /** Browser-local memory of the last workspace. */
    const STORAGE_KEY = 'dsh.markdownEditor.workspace'
    /** Largest source text a preview renders in one pass. */
    const PREVIEW_LIMIT = 300000

    const en = {
      panel: 'Markdown editor',
      title: 'Markdown editor',
      'workspace.label': 'Workspace',
      'action.refresh': 'Refresh files',
      'action.new': 'New file',
      'action.save': 'Save',
      'action.reload': 'Reload',
      'action.overwrite': 'Overwrite',
      'action.cancel': 'Cancel',
      'action.create': 'Create',
      'action.retry': 'Retry',
      'action.checkAgain': 'Check again',
      'view.label': 'View mode',
      'view.edit': 'Edit',
      'view.split': 'Split',
      'view.preview': 'Preview',
      'list.label': 'Files',
      'list.filter': 'Filter files',
      'list.empty': 'No Markdown files in this workspace',
      'list.emptyFilter': 'No file matches the filter',
      'list.count': '{count} files',
      'list.truncated': 'Showing the first {count} files',
      'new.placeholder': 'docs/notes.md',
      'new.hint': 'A missing .md extension is added. Parent folders must already exist.',
      'empty.title': 'Pick a Markdown file',
      'empty.body': 'Choose a file on the left, or create one. Saves write straight to the workspace.',
      'empty.new': 'Create a file',
      'noWorkspace.title': 'No workspace yet',
      'noWorkspace.body': 'Add a workspace in the sidebar, then reopen this editor.',
      'status.idle': 'Not saved yet',
      'status.dirty': 'Unsaved changes',
      'status.saved': 'Saved',
      'status.saving': 'Saving…',
      'status.readOnly': 'Read-only',
      'status.loading': 'Loading…',
      'status.upToDate': 'Up to date',
      'preview.empty': 'Nothing to preview yet',
      'status.lines': '{count} lines',
      'status.chars': '{count} characters',
      'notice.saved': 'Saved to the workspace.',
      'docViewer.label': 'Markdown edit',
      'doc.noWorkspace': 'This session has no workspace yet.',
      'doc.outsideWorkspace': 'This file is outside the session workspace, so it cannot be edited here.',
      'doc.loadingWorkspace': 'Waiting for the workspace…',
      'notice.created': 'File created.',
      'notice.noChanges': 'Nothing to save.',
      'notice.external': 'This file changed on disk after it was opened.',
      'notice.previewTruncated': 'Preview truncated for a very large file.',
      'confirm.discard': 'Discard the unsaved changes to this file?',
      'confirm.reload': 'Reload from disk and discard your unsaved changes?',
      'error.generic': 'The request failed.',
      'error.unavailable': 'The filesystem service is unavailable.',
      'error.invalid-path': 'That path is not valid inside the workspace.',
      'error.not-found': 'The file no longer exists.',
      'error.not-text': 'The file cannot be opened as Markdown text.',
      'error.too-large': 'The file exceeds the 2 MB editor limit.',
      'error.stale': 'The file changed on disk. Reload it or overwrite it.',
      'error.exists': 'A file with that name already exists.',
      'error.denied': 'The file policy denied this operation.',
      'error.read-only': 'The deployment file policy is read-only.',
      'error.no-workspace': 'No workspace is registered.',
      'error.missing-parent': 'The parent folder does not exist. Create it first.',
      'error.invalid-body': 'The editor sent an invalid request.',
      'error.unknown-op': 'The editor sent an unknown operation.',
      'error.read-failed': 'The file could not be read.',
      'error.write-failed': 'The file could not be saved.',
      'error.aborted': 'The operation was cancelled.',
    }

    const zh = {
      panel: 'Markdown 编辑器',
      title: 'Markdown 编辑器',
      'workspace.label': '工作区',
      'action.refresh': '刷新文件',
      'action.new': '新建文件',
      'action.save': '保存',
      'action.reload': '重新载入',
      'action.overwrite': '覆盖保存',
      'action.cancel': '取消',
      'action.create': '创建',
      'action.retry': '重试',
      'action.checkAgain': '重新检查',
      'view.label': '视图模式',
      'view.edit': '编辑',
      'view.split': '分栏',
      'view.preview': '预览',
      'list.label': '文件列表',
      'list.filter': '筛选文件',
      'list.empty': '这个工作区里还没有 Markdown 文件',
      'list.emptyFilter': '没有匹配的文件',
      'list.count': '{count} 个文件',
      'list.truncated': '仅显示前 {count} 个文件',
      'new.placeholder': 'docs/notes.md',
      'new.hint': '缺少 .md 后缀时会自动补上；上级目录需要已存在。',
      'empty.title': '选择一个 Markdown 文件',
      'empty.body': '从左侧打开文件，或新建一个。保存会直接写入工作区。',
      'empty.new': '新建文件',
      'noWorkspace.title': '还没有工作区',
      'noWorkspace.body': '先在侧边栏添加一个工作区，再打开这个编辑器。',
      'status.idle': '尚未保存',
      'status.dirty': '有未保存的修改',
      'status.saved': '已保存',
      'status.saving': '正在保存…',
      'status.readOnly': '只读',
      'status.loading': '正在载入…',
      'status.upToDate': '与磁盘一致',
      'preview.empty': '暂无内容可预览',
      'status.lines': '{count} 行',
      'status.chars': '{count} 字符',
      'notice.saved': '已保存到工作区。',
      'docViewer.label': 'Markdown 编辑',
      'doc.noWorkspace': '这个会话还没有归属的工作区。',
      'doc.outsideWorkspace': '该文件不在会话工作区内，无法在这里编辑。',
      'doc.loadingWorkspace': '正在等待工作区…',
      'notice.created': '文件已创建。',
      'notice.noChanges': '没有需要保存的修改。',
      'notice.external': '打开后这个文件在磁盘上发生了变化。',
      'notice.previewTruncated': '文件过大，预览已截断。',
      'confirm.discard': '放弃这个文件未保存的修改？',
      'confirm.reload': '从磁盘重新载入并放弃未保存的修改？',
      'error.generic': '请求失败。',
      'error.unavailable': '文件系统服务不可用。',
      'error.invalid-path': '该路径在工作区内无效。',
      'error.not-found': '文件已不存在。',
      'error.not-text': '无法以 Markdown 文本打开该文件。',
      'error.too-large': '文件超过编辑器 2 MB 的上限。',
      'error.stale': '文件在磁盘上已变化，请重新载入或覆盖保存。',
      'error.exists': '同名文件已存在。',
      'error.denied': '文件策略拒绝了这次操作。',
      'error.read-only': '当前部署的文件策略为只读。',
      'error.no-workspace': '没有已注册的工作区。',
      'error.missing-parent': '上级目录不存在，请先创建目录。',
      'error.invalid-body': '编辑器发起了无效请求。',
      'error.unknown-op': '编辑器发起了未知操作。',
      'error.read-failed': '文件读取失败。',
      'error.write-failed': '文件保存失败。',
      'error.aborted': '操作已取消。',
    }

    // ---------------------------------------------------------------- memory

    /** Survives a panel switch (the main slot unmounts an inactive page). */
    const remembered = {
      workspaces: undefined,
      workspaceId: '',
      activePath: null,
      view: 'split',
      readOnly: false,
    }

    /** Unsaved text kept across panel switches, keyed by workspace and path. */
    const drafts = new Map()

    /**
     * Key one draft.
     * @param {string} workspaceId - workspace id.
     * @param {string} relative - workspace-relative path.
     * @returns the draft key.
     */
    function draftKey(workspaceId, relative) {
      return `${workspaceId}\u0000${relative}`
    }

    /**
     * Read the remembered workspace id.
     * @returns the stored id, or null.
     */
    function readStoredWorkspace() {
      try {
        return window.localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    }

    /**
     * Persist the remembered workspace id.
     * @param {string} id - workspace id.
     */
    function storeWorkspace(id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, id)
      } catch {
        // Private browsing can refuse storage; the panel still works per mount.
      }
    }

    // ----------------------------------------------------------- host client

    /**
     * Fetch one read operation.
     * @param {Record<string, string>} params - query parameters.
     * @returns {Promise<object>} the response body.
     */
    async function apiGet(params) {
      const url = new URL(API, window.location.origin)
      for (const [name, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.set(name, String(value))
      }
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      return readApiResponse(response)
    }

    /**
     * Fetch one write operation.
     * @param {object} payload - JSON body.
     * @returns {Promise<object>} the response body.
     */
    async function apiPost(payload) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      return readApiResponse(response)
    }

    /**
     * Turn a response into a body or a coded failure.
     * @param {Response} response - the fetch response.
     * @returns {Promise<object>} the body.
     */
    async function readApiResponse(response) {
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (response.ok && body && body.ok === true) return body
      const reported = body && body.error
      const failure = new Error(
        (reported && reported.message) || `HTTP ${response.status}`,
      )
      failure.code = (reported && reported.code) ||
        (response.status === 403 ? 'denied' : response.status === 409 ? 'stale' : `http-${response.status}`)
      failure.status = response.status
      throw failure
    }

    // -------------------------------------------------------------- markdown

    /**
     * Escape text for HTML text and attribute contexts.
     * @param {unknown} value - raw value.
     * @returns {string} escaped text.
     */
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, character => {
        if (character === '&') return '&amp;'
        if (character === '<') return '&lt;'
        if (character === '>') return '&gt;'
        if (character === '"') return '&quot;'
        return '&#39;'
      })
    }

    /**
     * Admit only schemes that cannot execute script.
     * @param {string} url - already-escaped URL.
     * @returns {string|null} the URL, or null when refused.
     */
    function safeUrl(url) {
      return /^(?:https?:\/\/|mailto:|#)/i.test(url) ? url : null
    }

    /**
     * Render inline Markdown over already-escaped text.
     * @param {string} text - escaped text.
     * @returns {string} HTML.
     */
    function inlineMarkdown(text) {
      const codes = []
      let out = text.replace(/`([^`\n]+)`/g, (_, code) => {
        const token = `\u0000${codes.length}\u0000`
        codes.push(code)
        return token
      })
      out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => {
        const safe = safeUrl(url)
        if (safe === null) return alt
        return `<span class="dsh-md-image" title="${safe}">${alt === '' ? safe : alt}</span>`
      })
      out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (whole, label, url) => {
        const safe = safeUrl(url)
        if (safe === null) return label
        return `<a href="${safe}" target="_blank" rel="noreferrer noopener">${label}</a>`
      })
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
      out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
      out = out.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
      return out
    }

    /**
     * Split one table row into trimmed cells.
     * @param {string} line - raw table line.
     * @returns {string[]} cells.
     */
    function splitTableRow(line) {
      let text = line.trim()
      if (text.startsWith('|')) text = text.slice(1)
      if (text.endsWith('|')) text = text.slice(0, -1)
      return text.split('|').map(cell => cell.trim())
    }

    /**
     * Whether a line is a table's delimiter row.
     * @param {string} line - candidate line.
     * @returns {boolean} true for a GFM delimiter row.
     */
    function isTableDelimiter(line) {
      if (!line.includes('-')) return false
      const cells = splitTableRow(line)
      return cells.length > 0 && cells.every(cell => /^:?-{2,}:?$/.test(cell))
    }

    /**
     * Whether a line starts a block the paragraph reader must stop at.
     * @param {string} line - candidate line.
     * @returns {boolean} true when a block starts.
     */
    function startsBlock(line) {
      if (/^\s*(?:```|~~~)/.test(line)) return true
      if (/^#{1,6}\s+/.test(line)) return true
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return true
      if (/^\s*>/.test(line)) return true
      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) return true
      return false
    }

    /**
     * Render Markdown to safe HTML. All source text is escaped before any
     * markup is generated, and only inert link targets survive.
     * @param {string} source - Markdown source.
     * @returns {string} HTML.
     */
    function renderMarkdown(source) {
      const lines = String(source === null || source === undefined ? '' : source)
        .replace(/\r\n?/g, '\n')
        .split('\n')
      const out = []
      let i = 0
      while (i < lines.length) {
        const raw = lines[i]
        const line = raw.replace(/\s+$/, '')

        const fence = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/.exec(line)
        if (fence) {
          const marker = fence[1]
          const language = fence[2]
          const buffer = []
          i += 1
          while (i < lines.length && !new RegExp(`^\\s*${marker}`).test(lines[i])) {
            buffer.push(lines[i])
            i += 1
          }
          i += 1
          const attribute = language === '' ? '' : ` data-lang="${escapeHtml(language)}"`
          out.push(`<pre class="dsh-md-code"${attribute}><code>${escapeHtml(buffer.join('\n'))}</code></pre>`)
          continue
        }

        if (line.trim() === '') {
          i += 1
          continue
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = heading[1].length
          out.push(`<h${level}>${inlineMarkdown(escapeHtml(heading[2].trim()))}</h${level}>`)
          i += 1
          continue
        }

        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
          out.push('<hr>')
          i += 1
          continue
        }

        if (/^\s*>/.test(line)) {
          const buffer = []
          while (i < lines.length && /^\s*>/.test(lines[i])) {
            buffer.push(lines[i].replace(/^\s*>\s?/, ''))
            i += 1
          }
          out.push(`<blockquote>${renderMarkdown(buffer.join('\n'))}</blockquote>`)
          continue
        }

        if (line.includes('|') && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
          const header = splitTableRow(line)
          const alignment = splitTableRow(lines[i + 1]).map(spec => {
            if (spec.startsWith(':') && spec.endsWith(':')) return 'center'
            if (spec.endsWith(':')) return 'right'
            return 'left'
          })
          i += 2
          const rows = []
          while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
            rows.push(splitTableRow(lines[i]))
            i += 1
          }
          const cells = (tag, row) => row.map((cell, index) =>
            `<${tag} style="text-align:${alignment[index] === undefined ? 'left' : alignment[index]}">${inlineMarkdown(escapeHtml(cell))}</${tag}>`,
          ).join('')
          out.push(
            `<div class="dsh-md-tablewrap"><table><thead><tr>${cells('th', header)}</tr></thead>`
            + `<tbody>${rows.map(row => `<tr>${cells('td', row)}</tr>`).join('')}</tbody></table></div>`,
          )
          continue
        }

        const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw)
        if (listItem) {
          const ordered = /^\d+[.)]$/.test(listItem[2])
          const start = ordered ? Number(listItem[2].slice(0, -1)) : 1
          const items = []
          while (i < lines.length) {
            const match = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i])
            if (!match) break
            if (/^\d+[.)]$/.test(match[2]) !== ordered) break
            const leading = match[1].replace(/\t/g, '  ').length
            const depth = Math.min(5, Math.floor(leading / 2))
            items.push({ depth, text: match[3] })
            i += 1
          }
          const body = items.map(item => {
            const task = /^\[([ xX])\]\s+(.*)$/.exec(item.text)
            const indent = item.depth === 0 ? '' : ` style="margin-left:${item.depth * 18}px"`
            if (task) {
              const checked = task[1].trim() !== ''
              return `<li class="dsh-md-task"${indent}><span class="dsh-md-taskbox${checked ? ' is-checked' : ''}" aria-hidden="true"></span>`
                + `<span${checked ? ' class="dsh-md-taskdone"' : ''}>${inlineMarkdown(escapeHtml(task[2]))}</span></li>`
            }
            return `<li${indent}>${inlineMarkdown(escapeHtml(item.text))}</li>`
          }).join('')
          const tag = ordered ? 'ol' : 'ul'
          const startAttribute = ordered && start !== 1 ? ` start="${start}"` : ''
          out.push(`<${tag}${startAttribute}>${body}</${tag}>`)
          continue
        }

        const paragraph = []
        while (i < lines.length && lines[i].trim() !== '' && !startsBlock(lines[i])) {
          paragraph.push(lines[i].trim())
          i += 1
        }
        if (paragraph.length > 0) {
          out.push(`<p>${paragraph.map(text => inlineMarkdown(escapeHtml(text))).join('<br>')}</p>`)
          continue
        }

        out.push(`<p>${inlineMarkdown(escapeHtml(line.trim()))}</p>`)
        i += 1
      }
      return out.join('\n')
    }

    // ---------------------------------------------------------------- styles

    const CSS = `
.dsh-md-root {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
}
.dsh-md-root *, .dsh-md-root *::before, .dsh-md-root *::after { box-sizing: border-box; }
.dsh-md-root button { font: inherit; color: inherit; }
.dsh-md-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: calc(14px + var(--dsh-frame-top-clearance, 0px)) 20px 13px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-md-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.dsh-md-brandmark {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-business-primary);
}
.dsh-md-titles { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
.dsh-md-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.3; }
.dsh-md-subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
}
.dsh-md-headspace { flex: 1 1 auto; min-width: 8px; }
.dsh-md-headactions { flex: none; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.dsh-md-select {
  max-width: 210px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
}
.dsh-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-md-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-md-btn:disabled { cursor: default; opacity: .45; }
.dsh-md-btn.is-primary {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
  font-weight: 600;
}
.dsh-md-btn.is-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.dsh-md-btn.is-icon { width: 28px; padding: 0; }
.dsh-md-root button:focus-visible, .dsh-md-root select:focus-visible, .dsh-md-root input:focus-visible, .dsh-md-root textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
.dsh-md-notice {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 20px 0;
  padding: 8px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  font-size: 12px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-md-notice.is-error {
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);
}
.dsh-md-notice.is-warn {
  border-color: var(--dsw-alias-state-warn-primary);
  color: var(--dsw-alias-state-warn-label);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}
.dsh-md-notice.is-ok {
  border-color: var(--dsw-alias-state-success-primary);
  color: var(--dsw-alias-state-success-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent);
}
.dsh-md-notice span { min-width: 0; }
.dsh-md-notice .dsh-md-noticeactions { margin-left: auto; display: flex; gap: 6px; }
.dsh-md-body { flex: 1 1 auto; display: flex; min-height: 0; }
.dsh-md-sidebar {
  flex: none;
  display: flex;
  flex-direction: column;
  width: 244px;
  min-height: 0;
  border-right: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
}
.dsh-md-sidebarhead { flex: none; display: flex; align-items: center; gap: 6px; padding: 10px 10px 8px; }
.dsh-md-filter {
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
}
.dsh-md-filter::placeholder, .dsh-md-newinput::placeholder { color: var(--dsw-alias-label-secondary); }
.dsh-md-newbar { flex: none; padding: 0 10px 8px; display: flex; flex-direction: column; gap: 6px; }
.dsh-md-newrow { display: flex; gap: 6px; }
.dsh-md-newinput {
  flex: 1 1 auto;
  min-width: 0;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
}
.dsh-md-newhint { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dsh-md-filelist { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 2px 8px 8px; }
.dsh-md-file {
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 12.5px;
  line-height: 1.4;
}
.dsh-md-file:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-md-file.is-active { background: var(--dsw-alias-interactive-bg-active); box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary); }
.dsh-md-filename { flex: none; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-md-filedir {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.dsh-md-dirtydot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); }
.dsh-md-listfoot {
  flex: none;
  padding: 7px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.dsh-md-main { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.dsh-md-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-md-seg { display: inline-flex; padding: 2px; border-radius: 8px; background: var(--dsw-alias-interactive-bg-hover); }
.dsh-md-segbtn {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  cursor: pointer;
}
.dsh-md-segbtn[aria-pressed="true"] {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dsh-md-docpath {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-md-toolbarspace { flex: 1 1 auto; }
.dsh-md-status { flex: none; display: flex; align-items: center; gap: 10px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.dsh-md-status .is-dirty { color: var(--dsw-alias-state-warn-primary); }
.dsh-md-status .is-saved { color: var(--dsw-alias-state-success-primary); }
.dsh-md-status .is-error { color: var(--dsw-alias-state-error-primary); }
.dsh-md-panes { flex: 1 1 auto; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
.dsh-md-panes.is-edit, .dsh-md-panes.is-preview { grid-template-columns: 1fr; }
.dsh-md-editorwrap { display: flex; min-width: 0; min-height: 0; }
.dsh-md-editor {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 16px 20px 40px;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace);
  font-size: var(--dsh-content-font-size-secondary, 12.5px);
  line-height: 1.7;
  tab-size: 2;
}
.dsh-md-previewwrap { min-width: 0; min-height: 0; overflow: auto; border-left: 1px solid var(--dsw-alias-border-l2); }
.dsh-md-prose { padding: 18px 26px 56px; font-size: var(--dsh-content-font-size-secondary, 13.5px); line-height: 1.72; max-width: 860px; }
.dsh-md-prose > :first-child { margin-top: 0; }
.dsh-md-prose h1, .dsh-md-prose h2, .dsh-md-prose h3, .dsh-md-prose h4, .dsh-md-prose h5, .dsh-md-prose h6 {
  margin: 1.35em 0 .55em;
  line-height: 1.3;
  font-weight: 600;
}
.dsh-md-prose h1 { font-size: 1.7em; }
.dsh-md-prose h2 { font-size: 1.4em; }
.dsh-md-prose h3 { font-size: 1.18em; }
.dsh-md-prose h4, .dsh-md-prose h5, .dsh-md-prose h6 { font-size: 1em; }
.dsh-md-prose p { margin: .7em 0; }
.dsh-md-prose ul, .dsh-md-prose ol { margin: .6em 0; padding-left: 1.5em; }
.dsh-md-prose li { margin: .22em 0; }
.dsh-md-prose a { color: var(--dsw-alias-link); text-decoration: none; }
.dsh-md-prose a:hover { text-decoration: underline; }
.dsh-md-prose code {
  padding: .12em .38em;
  border-radius: 4px;
  background: var(--dsw-alias-markdown-inline-code);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: .9em;
}
.dsh-md-prose pre.dsh-md-code {
  position: relative;
  margin: 1em 0;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 9px;
  background: var(--dsw-alias-markdown-code-block);
  font-size: 12px;
  line-height: 1.62;
}
.dsh-md-prose pre.dsh-md-code code { padding: 0; background: transparent; font-size: inherit; }
.dsh-md-prose pre.dsh-md-code[data-lang] { padding-top: 26px; }
.dsh-md-prose pre.dsh-md-code[data-lang]::before {
  content: attr(data-lang);
  position: absolute;
  top: 6px;
  right: 10px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.dsh-md-prose blockquote {
  margin: 1em 0;
  padding: .1em 0 .1em 14px;
  border-left: 3px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
}
.dsh-md-prose hr { margin: 1.6em 0; border: 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-md-prose .dsh-md-tablewrap { margin: 1em 0; overflow: auto; }
.dsh-md-prose table { border-collapse: collapse; width: 100%; font-size: .95em; }
.dsh-md-prose th, .dsh-md-prose td { padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l2); }
.dsh-md-prose th { background: var(--dsw-alias-markdown-code-block); font-weight: 600; }
.dsh-md-prose .dsh-md-image {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: .92em;
}
.dsh-md-prose .dsh-md-task { list-style: none; display: flex; align-items: baseline; gap: 7px; }
.dsh-md-prose .dsh-md-taskbox {
  position: relative;
  flex: none;
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 3px;
  transform: translateY(1px);
}
.dsh-md-prose .dsh-md-taskbox.is-checked { border-color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-state-business-primary); }
.dsh-md-prose .dsh-md-taskbox.is-checked::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(43deg);
}
.dsh-md-prose .dsh-md-taskdone { color: var(--dsw-alias-label-secondary); text-decoration: line-through; }
.dsh-md-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 24px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
}
.dsh-md-emptyicon { color: var(--dsw-alias-state-idle-primary); }
.dsh-md-emptytitle { font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsh-md-emptybody { max-width: 360px; font-size: 12.5px; }
.dsh-md-loading { padding: 32px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.dsh-md-readonlybadge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-secondary);
}
@media (max-width: 860px) {
  .dsh-md-sidebar { width: 196px; }
  .dsh-md-panes { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .dsh-md-panes.is-edit, .dsh-md-panes.is-preview { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  .dsh-md-previewwrap { border-left: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
}
@media (max-width: 620px) {
  .dsh-md-head { flex-wrap: wrap; }
  .dsh-md-sidebar { width: 164px; }
  .dsh-md-select { max-width: 130px; }
  .dsh-md-docpath { display: none; }
}
`

    /** Styles specific to the document-tab editor (the shared page CSS supplies its controls). */
    const DOC_CSS = `
.dsh-md-doc {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  white-space: normal;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: 1.5;
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif);
}
.dsh-md-doc *, .dsh-md-doc *::before, .dsh-md-doc *::after { box-sizing: border-box; }
.dsh-md-docbar {
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-md-docname {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 11px;
}
.dsh-md-doc .dsh-md-notice { margin: 7px 10px 0; }
.dsh-md-doc .dsh-md-loading { padding: 22px 14px; }
.dsh-md-doc .dsh-md-empty { padding: 28px 16px; }
.dsh-md-doceditor {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  padding: 12px 14px 40px;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: var(--dsh-content-font-size-secondary, 12.5px);
  line-height: 1.7;
  tab-size: 2;
}
.dsh-md-doc button:focus-visible, .dsh-md-doc textarea:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}
`

    // --------------------------------------------------------------- helpers

    /**
     * Base name of a workspace-relative path.
     * @param {string} relative - path.
     * @returns the final segment.
     */
    function baseName(relative) {
      const index = relative.lastIndexOf('/')
      return index === -1 ? relative : relative.slice(index + 1)
    }

    /**
     * Directory prefix of a workspace-relative path.
     * @param {string} relative - path.
     * @returns the directory, or an empty string.
     */
    function directoryName(relative) {
      const index = relative.lastIndexOf('/')
      return index === -1 ? '' : relative.slice(0, index)
    }

    /**
     * Format a byte count.
     * @param {number} bytes - size.
     * @returns display text.
     */
    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    /**
     * Replace one `{name}` placeholder.
     * @param {string} template - text with a placeholder.
     * @param {string} value - replacement.
     * @returns replaced text.
     */
    function fill(template, value) {
      return String(template).replace('{count}', String(value))
    }

    /**
     * An empty document record.
     * @returns document state.
     */
    function emptyDocument() {
      return { path: null, content: '', saved: '', version: null, size: 0, loading: false, error: null }
    }

    /**
     * The path one `dsh-resource://file/…` address names, ignoring query and fragment.
     * @param {string} address - resource address.
     * @returns {string|null} decoded path, or null for another scope.
     */
    function fileAddressPath(address) {
      const prefix = 'dsh-resource://file/'
      if (typeof address !== 'string' || !address.startsWith(prefix)) return null
      const end = address.search(/[?#]/)
      const parts = address.slice(prefix.length, end === -1 ? undefined : end).split('/')
      const scope = parts.shift()
      try {
        if (scope === 'session') {
          if (parts.length < 2 || parts[0] === '') return null
          return parts.slice(1).map(decodeURIComponent).join('/')
        }
        if (scope === 'absolute') {
          if (parts.length === 0) return null
          const unc = parts[0] === '' && parts.length > 1
          const decoded = (unc ? parts.slice(1) : parts).map(decodeURIComponent)
          if (decoded.length === 0 || decoded[0] === '') return null
          return unc ? `//${decoded.join('/')}` : `/${decoded.join('/')}`
        }
      } catch {
        return null
      }
      return null
    }

    /**
     * Whether a file path lies inside a workspace directory, ignoring a trailing separator.
     * @param {string} root - workspace directory.
     * @param {string} file - absolute file path.
     * @returns {boolean} true when the file is the root or below it.
     */
    function pathInside(root, file) {
      if (typeof root !== 'string' || root === '' || typeof file !== 'string' || file === '') return false
      const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
      const target = file.replace(/\\/g, '/')
      const caseFold = /^[A-Za-z]:\//.test(base) || /^[A-Za-z]:\//.test(target)
      const left = caseFold ? base.toLowerCase() : base
      const right = caseFold ? target.toLowerCase() : target
      return right === left || right.startsWith(`${left}/`)
    }

    /**
     * Make one address path relative to the workspace that owns the session.
     * @param {string} root - workspace directory.
     * @param {string} path - address path, absolute or workspace-relative.
     * @returns {string|null} workspace-relative path, or null when outside.
     */
    function workspaceRelativePath(root, path) {
      if (typeof root !== 'string' || root === '' || typeof path !== 'string' || path === '') return null
      const normalized = path.replace(/\\/g, '/')
      const absolute = /^([A-Za-z]:)?\//.test(normalized)
      if (!absolute) return normalized.replace(/^(?:\.\/)+/, '')
      const base = root.replace(/\\/g, '/').replace(/\/+$/, '')
      const caseFold = /^[A-Za-z]:\//.test(base) || /^[A-Za-z]:\//.test(normalized)
      const left = caseFold ? base.toLowerCase() : base
      const right = caseFold ? normalized.toLowerCase() : normalized
      if (right === left) return ''
      if (!right.startsWith(`${left}/`)) return null
      return normalized.slice(base.length + 1)
    }

    /**
     * Empty state for the document-tab editor.
     * @param {string} address - the resource address this state belongs to.
     * @returns fresh state.
     */
    function emptyDocumentTab(address) {
      return { address, content: '', saved: '', version: null, loading: true, error: null }
    }

    /** Drafts kept in page memory when the viewer switches away from the editor. */
    const documentDrafts = new Map()

    /**
     * The panel icon: a filled Markdown sheet with a hash mark.
     * @param {{size?: number}} props - icon size supplied by the sidebar.
     * @returns the glyph.
     */
    function PanelIcon({ size = 20 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 36 36',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
      h('path', {
        d: 'M8.5 5.5A2.5 2.5 0 0 1 11 3h11.2L28 8.8v21.7a2.5 2.5 0 0 1-2.5 2.5H11a2.5 2.5 0 0 1-2.5-2.5Z',
        fill: 'currentColor',
        fillOpacity: 0.12,
      }),
      h('path', {
        d: 'M8.5 5.5A2.5 2.5 0 0 1 11 3h11.2L28 8.8v21.7a2.5 2.5 0 0 1-2.5 2.5H11a2.5 2.5 0 0 1-2.5-2.5Z',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinejoin: 'round',
      }),
      h('path', { d: 'M22 3v6h6', stroke: 'currentColor', strokeWidth: 1.9, strokeLinejoin: 'round' }),
      h('path', {
        d: 'M15.4 14.6h1.8l-.8 10.2h-1.8Zm5.4 0h1.8l-.8 10.2h-1.8ZM14.1 17.6h9v1.7h-9Zm-.6 3.6h9v1.7h-9Z',
        fill: 'currentColor',
      }))
    }

    // ------------------------------------------------- document-tab editor

    /**
     * The editor offered inside the right Sidebar's document viewer menu, next
     * to Markdown, Code, and Plain text. It shares the workspace panel's Host
     * route, so both surfaces write through one contract.
     * @param props - document body owner props, standard props, and copy.
     * @returns the editor body.
     */
    function MarkdownDocumentEditor({
      t, content, resourceAddress, sessionId, useWorkspaces, useResource, wrap, scrollportRef,
    }) {
      const workspaceSnapshot = useWorkspaces(snapshot => snapshot)
      const resolvedFile = useResource(resourceAddress)
      const absolutePath = typeof resolvedFile?.value?.absolutePath === 'string'
        ? resolvedFile.value.absolutePath
        : undefined
      const addressPath = useMemo(() => fileAddressPath(resourceAddress), [resourceAddress])
      const workspace = useMemo(() => {
        const items = Array.isArray(workspaceSnapshot.items) ? workspaceSnapshot.items : []
        if (absolutePath !== undefined) {
          // The resource's Host path is the most direct owner proof; prefer the
          // deepest matching workspace when one directory nests inside another.
          const matches = items
            .filter(item => pathInside(item.path, absolutePath))
            .sort((left, right) => right.path.length - left.path.length)
          if (matches.length > 0) return matches[0]
        }
        return items.find(item => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId)) || null
      }, [workspaceSnapshot, absolutePath, sessionId])
      const workspaceId = workspace === null ? '' : String(workspace.workspaceId)
      const workspacePath = workspace === null ? '' : workspace.path
      const relativePath = useMemo(() => {
        if (workspace === null) return null
        if (absolutePath !== undefined) return workspaceRelativePath(workspace.path, absolutePath)
        if (addressPath === null) return null
        return workspaceRelativePath(workspace.path, addressPath)
      }, [workspace, absolutePath, addressPath])
      const revision = content !== undefined && content.kind === 'renderer' ? content.revision : 0
      const [documentTab, setDocumentTab] = useState(() => {
        const draft = documentDrafts.get(resourceAddress)
        return draft === undefined
          ? emptyDocumentTab(resourceAddress)
          : { ...draft, address: resourceAddress, loading: true, error: null }
      })
      const [stale, setStale] = useState(false)
      const [notice, setNotice] = useState(null)
      const [savePhase, setSavePhase] = useState('idle')
      const [readOnly, setReadOnly] = useState(false)
      const [reloadTick, setReloadTick] = useState(0)
      const editorRef = useRef(null)
      const documentRef = useRef(documentTab)
      documentRef.current = documentTab
      const contentRef = useRef(content)
      contentRef.current = content

      const describe = useCallback((error) => {
        const code = error && error.code
        if (typeof code === 'string' && code !== '') {
          const translated = t(`error.${code}`)
          if (translated && translated !== `error.${code}`) return translated
        }
        if (error && error.message) return error.message
        return t('error.generic')
      }, [t])
      const describeRef = useRef(describe)
      describeRef.current = describe

      useEffect(() => {
        if (editorRef.current !== null) editorRef.current.focus()
      }, [])

      useEffect(() => {
        if (workspaceId === '') {
          // Distinguish "the snapshot is still arriving" from "there is no workspace".
          const loading = workspaceSnapshot.state === 'loading'
          const error = workspaceSnapshot.state === 'error'
            ? t('error.generic')
            : (loading ? null : t('doc.noWorkspace'))
          setDocumentTab(previous => previous.address === resourceAddress
            ? { ...previous, loading, error }
            : { ...emptyDocumentTab(resourceAddress), loading, error })
          return undefined
        }
        if (relativePath === null || relativePath === '') {
          setDocumentTab({
            ...emptyDocumentTab(resourceAddress),
            loading: false,
            error: t('doc.outsideWorkspace'),
          })
          contentRef.current?.failed?.()
          return undefined
        }
        let cancelled = false
        setDocumentTab(previous => previous.address === resourceAddress
          ? { ...previous, loading: true, error: null }
          : { ...emptyDocumentTab(resourceAddress), loading: true })
        apiGet({ op: 'file', workspace: workspaceId, path: relativePath }).then(body => {
          if (cancelled) return
          const current = documentRef.current
          const sameAddress = current.address === resourceAddress
          const dirty = sameAddress && current.content !== current.saved
          setReadOnly(body.readOnly === true)
          if (dirty && current.version === body.version) {
            // The restored draft still matches the disk: keep the text, refresh the baseline.
            setDocumentTab({
              address: resourceAddress,
              content: current.content,
              saved: body.content,
              version: body.version,
              loading: false,
              error: null,
            })
            contentRef.current?.loaded?.(body.version)
            return
          }
          if (dirty) {
            // The file changed under a draft: keep the text and offer reload/overwrite.
            setStale(true)
            setDocumentTab(previous => ({ ...previous, loading: false }))
            return
          }
          setStale(false)
          setDocumentTab({
            address: resourceAddress,
            content: body.content,
            saved: body.content,
            version: body.version,
            loading: false,
            error: null,
          })
          setSavePhase('idle')
          contentRef.current?.loaded?.(body.version)
        }).catch(error => {
          if (cancelled) return
          const message = describeRef.current(error)
          setDocumentTab(previous => previous.address === resourceAddress
            ? { ...previous, loading: false, error: message }
            : { ...emptyDocumentTab(resourceAddress), loading: false, error: message })
          contentRef.current?.failed?.()
        })
        return () => { cancelled = true }
      }, [
        resourceAddress, workspaceId, workspacePath, workspaceSnapshot.state,
        relativePath, revision, reloadTick,
      ])

      useEffect(() => {
        if (savePhase !== 'saved') return undefined
        const timer = window.setTimeout(() => setSavePhase('idle'), 2200)
        return () => window.clearTimeout(timer)
      }, [savePhase])

      useEffect(() => {
        if (!notice) return undefined
        const timer = window.setTimeout(() => setNotice(null), notice.kind === 'error' ? 9000 : 5000)
        return () => window.clearTimeout(timer)
      }, [notice])

      useEffect(() => () => {
        const current = documentRef.current
        if (current.address === resourceAddress && current.content !== current.saved) {
          documentDrafts.set(resourceAddress, {
            address: resourceAddress,
            content: current.content,
            saved: current.saved,
            version: current.version,
          })
        }
      }, [resourceAddress])

      const showing = documentTab.address === resourceAddress
      const dirty = showing && documentTab.content !== documentTab.saved

      const bindEditor = useCallback((node) => {
        editorRef.current = node
        scrollportRef(node)
      }, [scrollportRef])

      const save = useCallback(async (force) => {
        const current = documentRef.current
        if (current.address !== resourceAddress) return
        if (workspaceId === '' || relativePath === null || relativePath === '' || current.loading) return
        if (readOnly) {
          setNotice({ kind: 'error', text: t('error.read-only') })
          return
        }
        if (current.content === current.saved && force !== true) {
          setSavePhase('saved')
          setNotice({ kind: 'ok', text: t('notice.noChanges') })
          return
        }
        setSavePhase('saving')
        const written = current.content
        try {
          const body = await apiPost({
            op: 'save',
            workspace: workspaceId,
            path: relativePath,
            content: written,
            version: current.version,
            force: force === true,
          })
          documentDrafts.delete(resourceAddress)
          setDocumentTab(previous => previous.address === resourceAddress
            ? { ...previous, saved: written, version: body.version }
            : previous)
          setStale(false)
          setNotice({ kind: 'ok', text: t('notice.saved') })
          setSavePhase('saved')
          contentRef.current?.loaded?.(body.version)
        } catch (error) {
          setSavePhase('error')
          if (error.code === 'stale' || error.code === 'exists') setStale(true)
          setNotice({ kind: 'error', text: describeRef.current(error) })
        }
      }, [workspaceId, relativePath, readOnly, resourceAddress, t])

      const reloadFromDisk = useCallback(() => {
        const current = documentRef.current
        if (current.content !== current.saved && !window.confirm(t('confirm.reload'))) return
        documentDrafts.delete(resourceAddress)
        setStale(false)
        setNotice(null)
        setSavePhase('idle')
        setDocumentTab(previous => ({ ...previous, content: previous.saved }))
        setReloadTick(tick => tick + 1)
      }, [resourceAddress, t])

      const onKeyDown = useCallback((event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && (event.key === 's' || event.key === 'S')) {
          event.preventDefault()
          void save(false)
        }
      }, [save])

      const status = documentTab.loading
        ? t('status.loading')
        : documentTab.error
          ? t('error.read-failed')
          : savePhase === 'saving'
            ? t('status.saving')
            : readOnly
              ? t('status.readOnly')
              : dirty
                ? t('status.dirty')
                : savePhase === 'saved'
                  ? t('status.saved')
                  : t('status.upToDate')
      const statusClass = documentTab.error || savePhase === 'error'
        ? 'is-error'
        : dirty
          ? 'is-dirty'
          : savePhase === 'saved'
            ? 'is-saved'
            : ''

      const waitingOnly = workspaceId === '' && workspaceSnapshot.state !== 'error'
      const displayPath = relativePath === null || relativePath === '' ? (addressPath || '') : relativePath

      return h('div', { className: 'dsh-md-doc', onKeyDown },
        h('style', { dangerouslySetInnerHTML: { __html: `${CSS}\n${DOC_CSS}` } }),
        h('div', { className: 'dsh-md-docbar' },
          h('button', {
            type: 'button',
            className: 'dsh-md-btn is-primary',
            disabled: !showing || documentTab.loading || documentTab.error || relativePath === null || relativePath === ''
              || readOnly || dirty === false || savePhase === 'saving' || workspaceId === '',
            onClick: () => { void save(false) },
            title: '⌘S / Ctrl+S',
          }, savePhase === 'saving' ? t('status.saving') : t('action.save')),
          h('span', { className: 'dsh-md-docname', title: displayPath }, displayPath),
          h('div', { className: 'dsh-md-status' }, h('span', { className: statusClass }, status))),
        notice
          ? h('div', {
            className: `dsh-md-notice is-${notice.kind}`,
            role: notice.kind === 'error' ? 'alert' : 'status',
          }, h('span', null, notice.text))
          : null,
        stale
          ? h('div', { className: 'dsh-md-notice is-warn', role: 'status' },
            h('span', null, t('notice.external')),
            h('span', { className: 'dsh-md-noticeactions' },
              h('button', { type: 'button', className: 'dsh-md-btn', onClick: reloadFromDisk }, t('action.reload')),
              h('button', {
                type: 'button',
                className: 'dsh-md-btn',
                onClick: () => { void save(true) },
                disabled: readOnly,
              }, t('action.overwrite'))))
          : null,
        documentTab.loading || !showing
          ? h('div', { className: 'dsh-md-loading' }, waitingOnly ? t('doc.loadingWorkspace') : t('status.loading'))
          : documentTab.error
            ? h('div', { className: 'dsh-md-empty' },
              h('div', { className: 'dsh-md-emptytitle' }, workspaceId === '' ? t('doc.noWorkspace') : t('error.read-failed')),
              h('div', { className: 'dsh-md-emptybody' }, documentTab.error),
              h('button', { type: 'button', className: 'dsh-md-btn', onClick: reloadFromDisk }, t('action.retry')))
            : h('textarea', {
              className: 'dsh-md-doceditor',
              ref: bindEditor,
              value: documentTab.content,
              readOnly: readOnly,
              spellCheck: false,
              wrap: wrap === false ? 'off' : 'soft',
              'aria-label': displayPath || t('docViewer.label'),
              onChange: (event) => {
                const value = event.target.value
                setDocumentTab(previous => previous.address === resourceAddress
                  ? { ...previous, content: value }
                  : previous)
              },
            }))
    }

    // ---------------------------------------------------------------- page

    /**
     * The Markdown editor page.
     * @param {{t: (key: string) => string}} props - slot locale face.
     * @returns the page.
     */
    function MarkdownEditorPage({ t }) {
      const [workspaces, setWorkspaces] = useState(remembered.workspaces || [])
      const [workspaceId, setWorkspaceId] = useState(remembered.workspaceId)
      const [tree, setTree] = useState({ files: [], loading: false, truncated: false, error: null })
      const [filter, setFilter] = useState('')
      const [activePath, setActivePath] = useState(remembered.activePath)
      const [document, setDocument] = useState(emptyDocument)
      const [view, setView] = useState(remembered.view === 'edit' || remembered.view === 'preview' ? remembered.view : 'split')
      const [savePhase, setSavePhase] = useState('idle')
      const [readOnly, setReadOnly] = useState(Boolean(remembered.readOnly))
      const [stale, setStale] = useState(false)
      const [notice, setNotice] = useState(null)
      const [creating, setCreating] = useState(false)
      const [newName, setNewName] = useState('')
      const [refreshTick, setRefreshTick] = useState(0)
      const [documentTick, setDocumentTick] = useState(0)
      const [previewSource, setPreviewSource] = useState('')
      const [workspaceTick, setWorkspaceTick] = useState(0)
      const [workspaceError, setWorkspaceError] = useState(null)
      const newInputRef = useRef(null)

      const workspaceIdRef = useRef(workspaceId)
      workspaceIdRef.current = workspaceId
      const activePathRef = useRef(activePath)
      activePathRef.current = activePath
      const documentRef = useRef(document)
      documentRef.current = document
      const savePhaseRef = useRef(savePhase)
      savePhaseRef.current = savePhase
      const tRef = useRef(t)
      tRef.current = t

      /**
       * Localize one failure, preferring its machine code.
       * @param {unknown} error - thrown failure.
       * @returns display text.
       */
      const describe = useCallback((error) => {
        const code = error && error.code
        if (typeof code === 'string' && code !== '') {
          const translated = t(`error.${code}`)
          if (translated && translated !== `error.${code}`) return translated
        }
        if (error && error.message) return error.message
        return t('error.generic')
      }, [t])
      const describeRef = useRef(describe)
      describeRef.current = describe

      const selectedWorkspace = workspaces.find(workspace => workspace.id === workspaceId)

      useEffect(() => {
        let cancelled = false
        setWorkspaceError(null)
        apiGet({ op: 'workspaces' }).then(body => {
          if (cancelled) return
          remembered.workspaces = body.workspaces
          setWorkspaces(body.workspaces)
          setReadOnly(body.readOnly === true)
          remembered.readOnly = body.readOnly === true
          const stored = readStoredWorkspace()
          const rememberedId = remembered.workspaceId
          const preferred = [rememberedId, stored]
            .find(id => id && body.workspaces.some(workspace => workspace.id === id))
          const next = preferred || (body.workspaces[0] && body.workspaces[0].id) || ''
          const workspaceChanged = next !== remembered.workspaceId
          remembered.workspaceId = next
          setWorkspaceId(next)
          if (next === '' || workspaceChanged) {
            remembered.activePath = null
            setActivePath(null)
          }
        }).catch(error => {
          if (!cancelled) setWorkspaceError(describeRef.current(error))
        })
        return () => { cancelled = true }
      }, [workspaceTick])

      useEffect(() => {
        if (workspaceId === '') {
          setTree({ files: [], loading: false, truncated: false, error: null })
          return
        }
        let cancelled = false
        setTree(previous => ({ ...previous, loading: true, error: null }))
        apiGet({ op: 'files', workspace: workspaceId }).then(body => {
          if (cancelled) return
          setTree({
            files: body.files,
            loading: false,
            truncated: body.truncated === true,
            error: null,
          })
          if (typeof body.readOnly === 'boolean') {
            setReadOnly(body.readOnly)
            remembered.readOnly = body.readOnly
          }
        }).catch(error => {
          if (!cancelled) {
            setTree({ files: [], loading: false, truncated: false, error: describeRef.current(error) })
          }
        })
        return () => { cancelled = true }
      }, [workspaceId, refreshTick])

      useEffect(() => {
        if (workspaceId === '' || !activePath) {
          setPreviewSource('')
          setDocument(emptyDocument())
          return
        }
        let cancelled = false
        setStale(false)
        setDocument(previous => previous.path === activePath
          ? { ...previous, loading: true, error: null }
          : { ...emptyDocument(), path: activePath, loading: true })
        apiGet({ op: 'file', workspace: workspaceId, path: activePath }).then(body => {
          if (cancelled) return
          const draft = drafts.get(draftKey(workspaceId, activePath))
          const draftIsStale = draft !== undefined && draft.version !== body.version
          const content = draft === undefined ? body.content : draft.content
          setStale(draftIsStale)
          setPreviewSource(content)
          setDocument({
            path: activePath,
            content,
            saved: draft === undefined ? body.content : draft.saved,
            version: draft === undefined ? body.version : draft.version,
            size: body.size,
            loading: false,
            error: null,
          })
        }).catch(error => {
          if (cancelled) return
          setDocument({
            ...emptyDocument(),
            path: activePath,
            loading: false,
            error: describeRef.current(error),
          })
        })
        return () => { cancelled = true }
      }, [workspaceId, activePath, documentTick])

      useEffect(() => {
        if (savePhase !== 'saved') return undefined
        const timer = window.setTimeout(() => setSavePhase('idle'), 2200)
        return () => window.clearTimeout(timer)
      }, [savePhase])

      useEffect(() => {
        if (!notice) return undefined
        const timer = window.setTimeout(() => setNotice(null), notice.kind === 'error' ? 9000 : 5000)
        return () => window.clearTimeout(timer)
      }, [notice])

      useEffect(() => {
        const timer = window.setTimeout(() => setPreviewSource(document.content), 120)
        return () => window.clearTimeout(timer)
      }, [document.content])

      useEffect(() => {
        if (creating && newInputRef.current) newInputRef.current.focus()
      }, [creating])

      useEffect(() => () => {
        const current = documentRef.current
        const currentWorkspace = workspaceIdRef.current
        if (current.path && current.content !== current.saved && currentWorkspace !== '') {
          drafts.set(draftKey(currentWorkspace, current.path), {
            content: current.content,
            saved: current.saved,
            version: current.version,
          })
        }
        remembered.activePath = activePathRef.current
      }, [])

      const dirty = document.path !== null && document.content !== document.saved
      const dirtyRef = useRef(dirty)
      dirtyRef.current = dirty

      const filteredFiles = useMemo(() => {
        const term = filter.trim().toLowerCase()
        if (term === '') return tree.files
        return tree.files.filter(file => file.path.toLowerCase().includes(term))
      }, [tree.files, filter])

      const preview = useMemo(() => {
        if (view === 'edit') return { html: '', truncated: false }
        const source = previewSource.length > PREVIEW_LIMIT
          ? previewSource.slice(0, PREVIEW_LIMIT)
          : previewSource
        return {
          html: renderMarkdown(source),
          truncated: source.length < previewSource.length,
        }
      }, [previewSource, view])

      const lineCount = useMemo(
        () => (document.content === '' ? 0 : document.content.split('\n').length),
        [document.content],
      )

      /**
       * Open one listed file, confirming the loss of unsaved edits.
       * @param {string} relative - workspace-relative path.
       */
      const openFile = useCallback((relative) => {
        if (relative === activePathRef.current && documentRef.current.path === relative) return
        if (dirtyRef.current && documentRef.current.path) {
          if (!window.confirm(t('confirm.discard'))) return
          drafts.delete(draftKey(workspaceIdRef.current, documentRef.current.path))
        }
        setStale(false)
        setNotice(null)
        setActivePath(relative)
        remembered.activePath = relative
      }, [t])

      /**
       * Write the current editor content to disk.
       * @param {boolean} force - overwrite even when the disk version moved.
       */
      const save = useCallback(async (force) => {
        const current = documentRef.current
        const currentWorkspace = workspaceIdRef.current
        if (currentWorkspace === '' || !current.path || current.loading) return
        if (savePhaseRef.current === 'saving') return
        if (readOnly) {
          setNotice({ kind: 'error', text: t('error.read-only') })
          return
        }
        if (current.content === current.saved && force !== true) {
          setSavePhase('saved')
          setNotice({ kind: 'ok', text: t('notice.noChanges') })
          return
        }
        setSavePhase('saving')
        savePhaseRef.current = 'saving'
        const written = current.content
        try {
          const body = await apiPost({
            op: 'save',
            workspace: currentWorkspace,
            path: current.path,
            content: written,
            version: current.version,
            force: force === true,
          })
          drafts.delete(draftKey(currentWorkspace, current.path))
          setDocument(previous => previous.path === current.path
            ? { ...previous, saved: written, version: body.version, size: body.size }
            : previous)
          setStale(false)
          setNotice({ kind: 'ok', text: t('notice.saved') })
          setSavePhase('saved')
          setRefreshTick(tick => tick + 1)
        } catch (error) {
          setSavePhase('error')
          if (error.code === 'stale' || error.code === 'exists') setStale(true)
          setNotice({ kind: 'error', text: describeRef.current(error) })
        }
      }, [readOnly, t])

      /**
       * Re-read the current file from disk.
       */
      const reload = useCallback(() => {
        if (documentRef.current.content !== documentRef.current.saved && !window.confirm(t('confirm.reload'))) return
        drafts.delete(draftKey(workspaceIdRef.current, documentRef.current.path))
        setStale(false)
        setNotice(null)
        setDocumentTick(tick => tick + 1)
      }, [t])

      /**
       * Create a new Markdown document and open it.
       */
      const createFile = useCallback(async () => {
        let name = newName.trim().replace(/^\/+/, '')
        if (name === '' || workspaceIdRef.current === '') return
        if (dirtyRef.current && documentRef.current.path) {
          if (!window.confirm(t('confirm.discard'))) return
          drafts.delete(draftKey(workspaceIdRef.current, documentRef.current.path))
        }
        if (!/\.(?:md|markdown|mdx)$/i.test(name)) name = `${name}.md`
        const title = baseName(name).replace(/\.(?:md|markdown|mdx)$/i, '').replace(/[-_]+/g, ' ')
        try {
          const created = await apiPost({
            op: 'create',
            workspace: workspaceIdRef.current,
            path: name,
            content: `# ${title}\n\n`,
          })
          setCreating(false)
          setNewName('')
          setRefreshTick(tick => tick + 1)
          setStale(false)
          setActivePath(created.path)
          remembered.activePath = created.path
          setNotice({ kind: 'ok', text: t('notice.created') })
        } catch (error) {
          setNotice({ kind: 'error', text: describeRef.current(error) })
        }
      }, [newName, t])

      /**
       * Switch the inspected workspace.
       * @param {string} next - workspace id.
       */
      const selectWorkspace = useCallback((next) => {
        if (next === workspaceIdRef.current) return true
        if (dirtyRef.current && documentRef.current.path) {
          if (!window.confirm(t('confirm.discard'))) return false
          drafts.delete(draftKey(workspaceIdRef.current, documentRef.current.path))
        }
        remembered.workspaceId = next
        remembered.activePath = null
        storeWorkspace(next)
        setWorkspaceId(next)
        setActivePath(null)
        setStale(false)
        setDocument(emptyDocument())
        return true
      }, [t])

      /**
       * Save from the page-level shortcut.
       * @param {React.KeyboardEvent} event - key event.
       */
      const onRootKeyDown = useCallback((event) => {
        if ((event.metaKey || event.ctrlKey) && !event.altKey && (event.key === 's' || event.key === 'S')) {
          event.preventDefault()
          void save(false)
        }
      }, [save])

      const statusText = document.loading
        ? t('status.loading')
        : document.error
          ? t('error.read-failed')
          : savePhase === 'saving'
            ? t('status.saving')
            : readOnly
              ? t('status.readOnly')
              : dirty
                ? t('status.dirty')
                : savePhase === 'saved'
                  ? t('status.saved')
                  : t('status.upToDate')
      const statusClass = document.error || savePhase === 'error'
        ? 'is-error'
        : dirty
          ? 'is-dirty'
          : savePhase === 'saved'
            ? 'is-saved'
            : ''

      const showEditor = view !== 'preview'
      const showPreview = view !== 'edit'

      return h('div', {
        className: 'dsh-md-root',
        onKeyDown: onRootKeyDown,
      },
      h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
      h('header', { className: 'dsh-md-head' },
        h('div', { className: 'dsh-md-brand' },
          h('span', { className: 'dsh-md-brandmark' }, h(PanelIcon, { size: 19 })),
          h('div', { className: 'dsh-md-titles' },
            h('h1', { className: 'dsh-md-title' }, t('title')),
            h('div', { className: 'dsh-md-subtitle', title: selectedWorkspace ? selectedWorkspace.path : t('noWorkspace.body') },
              selectedWorkspace ? selectedWorkspace.path : t('noWorkspace.title')))),
        h('div', { className: 'dsh-md-headspace' }),
        h('div', { className: 'dsh-md-headactions' },
          workspaces.length > 1
            ? h('select', {
              className: 'dsh-md-select',
              value: workspaceId,
              'aria-label': t('workspace.label'),
              onChange: event => {
                const next = event.target.value
                if (!selectWorkspace(next)) event.target.value = workspaceId
              },
            }, workspaces.map(workspace => h('option', { key: workspace.id, value: workspace.id }, workspace.title)))
            : null,
          readOnly ? h('span', { className: 'dsh-md-readonlybadge' }, t('status.readOnly')) : null,
          h('button', {
            type: 'button',
            className: 'dsh-md-btn is-primary',
            disabled: !document.path || dirty === false || readOnly || savePhase === 'saving',
            onClick: () => { void save(false) },
            title: '⌘S / Ctrl+S',
          }, savePhase === 'saving' ? t('status.saving') : t('action.save')))),

      notice
        ? h('div', {
          className: `dsh-md-notice is-${notice.kind}`,
          role: notice.kind === 'error' ? 'alert' : 'status',
        }, h('span', null, notice.text))
        : null,
      stale
        ? h('div', { className: 'dsh-md-notice is-warn', role: 'status' },
          h('span', null, t('notice.external')),
          h('span', { className: 'dsh-md-noticeactions' },
            h('button', { type: 'button', className: 'dsh-md-btn', onClick: reload }, t('action.reload')),
            h('button', { type: 'button', className: 'dsh-md-btn', onClick: () => { void save(true) }, disabled: readOnly }, t('action.overwrite'))))
        : null,

      h('div', { className: 'dsh-md-body' },
        h('aside', { className: 'dsh-md-sidebar', 'aria-label': t('list.label') },
          h('div', { className: 'dsh-md-sidebarhead' },
            h('input', {
              className: 'dsh-md-filter',
              type: 'search',
              value: filter,
              placeholder: t('list.filter'),
              'aria-label': t('list.filter'),
              onChange: event => setFilter(event.target.value),
            }),
            h('button', {
              type: 'button',
              className: 'dsh-md-btn is-icon',
              title: t('action.new'),
              'aria-label': t('action.new'),
              disabled: workspaceId === '' || readOnly,
              onClick: () => { setCreating(value => !value); setNewName('') },
            }, '+'),
            h('button', {
              type: 'button',
              className: 'dsh-md-btn is-icon',
              title: t('action.refresh'),
              'aria-label': t('action.refresh'),
              disabled: workspaceId === '',
              onClick: () => setRefreshTick(tick => tick + 1),
            }, h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true },
              h('path', {
                d: 'M13 8a5 5 0 1 1-1.5-3.6M13 2.5V6h-3.5',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.5,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              })))),
          creating
            ? h('div', { className: 'dsh-md-newbar' },
              h('div', { className: 'dsh-md-newrow' },
                h('input', {
                  className: 'dsh-md-newinput',
                  ref: newInputRef,
                  value: newName,
                  placeholder: t('new.placeholder'),
                  'aria-label': t('action.new'),
                  onChange: event => setNewName(event.target.value),
                  onKeyDown: event => {
                    if (event.key === 'Enter') { event.preventDefault(); void createFile() }
                    if (event.key === 'Escape') { event.preventDefault(); setCreating(false); setNewName('') }
                  },
                }),
                h('button', {
                  type: 'button',
                  className: 'dsh-md-btn',
                  disabled: newName.trim() === '',
                  onClick: () => { void createFile() },
                }, t('action.create')),
                h('button', {
                  type: 'button',
                  className: 'dsh-md-btn is-icon',
                  'aria-label': t('action.cancel'),
                  title: t('action.cancel'),
                  onClick: () => { setCreating(false); setNewName('') },
                }, '×')),
              h('div', { className: 'dsh-md-newhint' }, t('new.hint')))
            : null,
          h('nav', { className: 'dsh-md-filelist', 'aria-label': t('list.label') },
            tree.loading && tree.files.length === 0
              ? h('div', { className: 'dsh-md-loading' }, t('status.loading'))
              : tree.error
                ? h('div', { className: 'dsh-md-loading' }, tree.error)
                : filteredFiles.length === 0
                  ? h('div', { className: 'dsh-md-loading' }, tree.files.length === 0 ? t('list.empty') : t('list.emptyFilter'))
                  : filteredFiles.map(file => h('button', {
                    key: file.path,
                    type: 'button',
                    className: `dsh-md-file${file.path === activePath ? ' is-active' : ''}`,
                    title: file.path,
                    'aria-current': file.path === activePath ? 'true' : undefined,
                    onClick: () => openFile(file.path),
                  },
                  h('span', { className: 'dsh-md-filename' }, baseName(file.path)),
                  directoryName(file.path) === ''
                    ? null
                    : h('span', { className: 'dsh-md-filedir' }, directoryName(file.path)),
                  dirty && file.path === document.path
                    ? h('span', { className: 'dsh-md-dirtydot', 'aria-hidden': true })
                    : null))),
          h('div', { className: 'dsh-md-listfoot' },
            tree.truncated
              ? fill(t('list.truncated'), tree.files.length)
              : `${fill(t('list.count'), filteredFiles.length)} · ${formatBytes(filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0))}`)),

        h('section', { className: 'dsh-md-main' },
          document.path
            ? h('div', { className: 'dsh-md-toolbar' },
              h('div', { className: 'dsh-md-seg', role: 'group', 'aria-label': t('view.label') },
                [['edit', t('view.edit')], ['split', t('view.split')], ['preview', t('view.preview')]].map(([id, label]) =>
                  h('button', {
                    key: id,
                    type: 'button',
                    className: 'dsh-md-segbtn',
                    'aria-pressed': view === id,
                    onClick: () => { setView(id); remembered.view = id },
                  }, label))),
              h('button', {
                type: 'button',
                className: 'dsh-md-btn is-icon',
                title: t('action.reload'),
                'aria-label': t('action.reload'),
                onClick: reload,
              }, h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true },
                h('path', {
                  d: 'M13 8a5 5 0 1 1-1.5-3.6M13 2.5V6H9.5',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 1.5,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }))),
              h('span', { className: 'dsh-md-docpath', title: document.path }, document.path),
              h('div', { className: 'dsh-md-toolbarspace' }),
              h('div', { className: 'dsh-md-status' },
                h('span', { className: statusClass }, statusText),
                h('span', null, fill(t('status.lines'), lineCount)),
                h('span', null, fill(t('status.chars'), document.content.length)),
                h('span', null, formatBytes(document.size))))
            : null,
          document.path
            ? (document.loading
              ? h('div', { className: 'dsh-md-loading' }, t('status.loading'))
              : document.error
                ? h('div', { className: 'dsh-md-empty' },
                  h('div', { className: 'dsh-md-emptytitle' }, t('error.read-failed')),
                  h('div', { className: 'dsh-md-emptybody' }, document.error),
                  h('button', { type: 'button', className: 'dsh-md-btn', onClick: reload }, t('action.retry')))
                : h('div', { className: `dsh-md-panes is-${view}` },
                  showEditor
                    ? h('div', { className: 'dsh-md-editorwrap' },
                      h('textarea', {
                        className: 'dsh-md-editor',
                        value: document.content,
                        spellCheck: false,
                        readOnly: readOnly,
                        'aria-label': document.path,
                        onChange: event => {
                          const value = event.target.value
                          setDocument(previous => ({ ...previous, content: value }))
                        },
                      }))
                    : null,
                  showPreview
                    ? h('div', { className: 'dsh-md-previewwrap', role: 'region', 'aria-label': t('view.preview') },
                      preview.truncated
                        ? h('div', { className: 'dsh-md-notice is-warn', style: { margin: '10px 18px 0' } }, h('span', null, t('notice.previewTruncated')))
                        : null,
                      document.content.trim() === ''
                        ? h('div', { className: 'dsh-md-loading' }, t('preview.empty'))
                        : h('div', { className: 'dsh-md-prose', dangerouslySetInnerHTML: { __html: preview.html } }))
                    : null))
            : h('div', { className: 'dsh-md-empty' },
              workspaceId === ''
                ? h(React.Fragment, null,
                  h('div', { className: 'dsh-md-emptytitle' }, workspaceError ? t('error.generic') : t('noWorkspace.title')),
                  h('div', { className: 'dsh-md-emptybody' }, workspaceError || t('noWorkspace.body')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-md-btn',
                    onClick: () => setWorkspaceTick(tick => tick + 1),
                  }, workspaceError ? t('action.retry') : t('action.checkAgain')))
                : h(React.Fragment, null,
                  h('div', { className: 'dsh-md-emptyicon' }, h(PanelIcon, { size: 44 })),
                  h('div', { className: 'dsh-md-emptytitle' }, t('empty.title')),
                  h('div', { className: 'dsh-md-emptybody' }, t('empty.body')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-md-btn is-primary',
                    disabled: readOnly,
                    onClick: () => { setCreating(true); setNewName('') },
                  }, t('empty.new')))))))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(
          () => ctx.locale.register(NS, { en, zh }),
          'markdown-editor: dictionaries',
        )
        ctx.effect(
          () => ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
          }, MarkdownEditorPage)),
          'markdown-editor: editor page',
        )
        ctx.effect(
          () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 20,
            label: () => t('panel'),
            locale: NS,
          }, PanelIcon)),
          'markdown-editor: sidebar entry',
        )
        // The document tab's viewer menu is another surface over the same file:
        // same Host route, same policy, same version checks.
        ctx.inject(['documentPreviews'], (documentCtx) => {
          documentCtx.effect(() => documentCtx.documentPreviews.register({
            id: DOC_EDIT_ID,
            extensions: ['md', 'markdown', 'mdx'],
            priority: 'builtin',
            title: () => t('docViewer.label'),
            loading: 'renderer',
            wrap: true,
          }), 'markdown-editor: document viewer metadata')
          documentCtx.effect(() => documentCtx.slots.inject('sidebar.right.tab.document', () => documentCtx.slots.register({
            name: 'sidebar.right.tab.document',
            key: DOC_EDIT_ID,
            locale: NS,
          }, MarkdownDocumentEditor)), 'markdown-editor: document viewer body')
        })
      },
      /** Test seam for the pure renderer; not used at runtime. */
      __test: { renderMarkdown, escapeHtml, fileAddressPath, workspaceRelativePath, pathInside },
    }
  },
})

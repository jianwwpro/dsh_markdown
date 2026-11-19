# Markdown editor

A Markdown file editor inside the DeepSeek Harness Web GUI. It is a global panel: select the **Markdown editor** icon in the left sidebar and the page fills the main column.

## Two places to edit

1. **Markdown editor panel** — the global page opened from the left sidebar icon. It browses a workspace and edits one file at a time.
2. **Markdown edit viewer** — inside any right-Sidebar document tab, the top-right viewer menu lists **Markdown**, **Code**, and **Plain text**; this bundle adds **Markdown edit** to that same menu. It edits the document that tab already points at, so the viewer choice and the file stay together. The tab's own reload button re-reads the file; unsaved text survives a switch to another viewer and back while the page stays open. The file must belong to the current Session's workspace; files outside it remain preview-only.

Both surfaces use the same Host route, path fences, size cap, and version checks.

## What it does

- Lists the `.md`, `.markdown`, and `.mdx` files of a registered workspace, newest scan bounded to 500 files and 8 directory levels. `node_modules`, build output, caches, and version-control or editor metadata folders are skipped.
- Opens one file in an editor with a live preview, or in edit-only and preview-only modes.
- Saves in place with `Cmd+S` / `Ctrl+S`. Saves are version-checked: if the file changed on disk after it was opened, the editor offers **Reload** or **Overwrite** instead of silently replacing newer content.
- Creates a Markdown file under the selected workspace. A missing `.md` extension is added; the parent folder must already exist.
- Keeps unsaved text when you switch panels and come back, and warns before a file switch discards it. Unsaved buffers live in page memory only, so a full page reload or app restart drops them.
- Follows the host theme, locale, focus rings, and light/dark appearance.
- Selects among registered workspaces when more than one exists, and remembers the last one in this browser.

## File policy and limits

- Reads and writes go through the runtime filesystem service, and writes carry the deployment's file mode with the selected workspace as their `workspace-write` root. A read-only deployment refuses saves and disables the controls.
- Paths stay inside the selected workspace; absolute paths, `..` segments, and non-Markdown extensions are rejected.
- One document is capped at 2 MB. Previews of very large files are truncated at 300,000 characters.
- The editor renames, deletes, moves, and formats nothing. Images are never loaded: image syntax appears as a labelled placeholder. Only `http(s)`, `mailto`, and in-page links become clickable; other link targets render as plain text.
- The page talks to its Host half over one authenticated exact Fetch route under `/api`, which the runtime admits only for the owner browser session. No other network access is used and no file content leaves the machine.

## 中文说明

这是一个内置于 DSH Web GUI 的 Markdown 文件编辑器，有两个入口：

1. **Markdown 编辑器面板**：左侧边栏的 **Markdown 编辑器** 图标，打开后占据主栏，用于浏览工作区并编辑文件。
2. **Markdown 编辑视图**：在右侧栏打开的任意文档标签页里，右上角的查看器菜单原本有 **Markdown**、**代码**、**纯文本**，本插件在同一菜单里增加 **Markdown 编辑**。它直接编辑该标签指向的文件；切换回其它查看器再切回来，未保存内容会保留（页面不刷新时）。文件必须属于当前会话的工作区，工作区外的文件只能用只读预览。

两个入口共用同一条 Host 路由、同样的路径围栏、大小上限和版本校验。

- 列出当前工作区中的 `.md`、`.markdown`、`.mdx` 文件，扫描范围最多 500 个文件、8 层目录，跳过 `node_modules`、构建产物、缓存和版本控制/编辑器配置目录。
- 支持编辑、分栏、预览三种视图，`Cmd+S` / `Ctrl+S` 保存。
- 保存带版本校验：文件在打开后被磁盘上的其他程序改过时，会提示 **重新载入** 或 **覆盖保存**。
- 新建文件时缺少 `.md` 后缀会自动补上，上级目录必须已存在。
- 切换其它面板再回来时会保留未保存内容；切换到别的文件前会确认是否放弃修改。未保存内容只保存在页面内存里，整页刷新或重启应用后不再保留。
- 写文件遵循当前部署的文件策略：只读模式会拒绝保存并禁用相关按钮。路径必须位于所选工作区内，且只允许 Markdown 扩展名；单个文件上限 2 MB。
- 不提供重命名、删除、移动或格式化；预览中的图片一律不加载，只显示占位标记；只有 `http(s)`、`mailto` 和页内锚点会成为链接，其他目标按纯文本显示。
- 页面只通过 `/api` 下一个仅限本机所有者会话访问的认证路由与 Host 通信，不会上传文件内容。

## Development

No build step: the package is plain ESM plus one browser module.

```sh
node tests/host.test.mjs
node tests/client.test.mjs
```

Node 20 or newer is enough; the tests use only Node built-ins. Install the bundle into a DSH profile with **Plugins → Add plugin** pointed at this directory, or with the `plugin_manager` `install_bundle` action from a DSH session. The Host half publishes one authenticated exact Fetch route under `/api`; the browser half registers a main panel, a sidebar entry, and a right-Sidebar document viewer.

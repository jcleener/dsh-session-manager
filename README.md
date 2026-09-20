# dsh-session-manager · DSH 会话管理器

> 给侧边栏加一个「会话管理」入口：浏览、搜索、分类、归档、回收站与恢复，全部在一个面板里完成。
> 删除不等于销毁数据 —— 「删除」= 归档（从侧边栏隐藏）+ 移入回收站，随时可恢复；
> 真正占用中的会话不会被拆掉，只会记入待删除清单，**重启 DSH 后**才彻底清除。
>
> 插件分两半：宿主半（`lib/index.js`）提供 HTTP 路由与状态文件，浏览器半（`lib/client.js`）
> 提供侧边栏入口、管理面板、分类角标，以及会话行「…」菜单里的两个自定义动作。

## 特性

- **侧边栏入口**：注册到 slot `sidebar.footer.action`（`id: dsh-session-manager-entry`，`order: -30`，`label: 会话管理`），点击打开 900px 管理面板。
- **三个标签页**：`全部` / `已归档` / `回收站`，各自有对应的批量操作。
- **搜索与筛选**：按标题、工作目录、会话 ID 搜索；按分类筛选（`全部分类` / `未分类` / 具体分类）。
- **单级分类 + 配色**：分类是字符串标签；可为分类设置背景色与字体色（`#RRGGBB`，非法值会被丢弃）。
- **批量操作**：归档、删除（移入回收站）、恢复、取消归档、永久删除、清空回收站；行上还有「全选」。
- **会话行菜单注入**：监听核心侧边栏的 `[role="menu"]`，克隆其菜单项模板追加「设置类型」「直接删除」两项（图标取自 `@deepseek-ai/dsh-client-ui-primitives`）。
- **侧边栏分类角标**：会话标题左侧插入带分类配色的 `dsm-row-badge`，React 重渲染后由 MutationObserver 重新贴上。
- **回收站上限**：`TRASH_LIMIT = 100`，超出的按移入时间从旧到新自动永久删除。
- **零第三方依赖**：宿主半只用 `node:fs/promises`、`node:path`、`node:os`。

## 环境要求

- DSH web profile（`$env:DSH_HOME\profiles\web`）。宿主使用 `webServer` 服务；客户端使用 `slots` / `workspaces` / `sessions`。
- 代码注释以 DSH 0.1.2 的核心行为为参照（侧边栏行菜单无 slot 接缝、核心不再提供本插件所需的集成），开发环境为 0.1.5-rc.1。
- **兼容性：DSH 0.1.6-alpha.2 可用**（2026-09-20 实测）。该版本从 `ISessions` 删除了
  `open` / `openSubagent` / `clear`，并从 `SessionListState` 删除了 `current`；本插件原先那段
  「被删的是不是当前会话 → 顺手 `clear()`」的逻辑已随之移除（选中态归壳层 `ui-workspace` /
  `ui-session` 自己处理），只保留仍然存在的 `sessions.refresh()`。0.1.5-rc.1 亦兼容。
- 无 Node 版本下限声明（`package.json` 未写 `engines`，未在代码中明确）。

## 部署（重启 + 硬刷新）

1. 拷贝插件到 profile 的 node_modules：
   ```powershell
   Copy-Item -Recurse -Force D:\DSH\design\DSHPlugin-0831\dsh-session-manager $env:DSH_HOME\profiles\web\node_modules\dsh-session-manager
   ```
2. 挂载：`package.json` 的 `dsh.bundle.patch` 指向本包的 `cordis.patch.yml`，内容即挂载行：
   ```yaml
   - insert:
       - id: dsh-session-manager
         name: dsh-session-manager
   ```
3. **重启 DSH 实例**，让宿主半加载（客户端半由 `dsh.client`（`platform: web`）发现，需**硬刷新页面 Ctrl+F5**）。

## 配置

**无配置**：宿主没有调用 `settings.register(...)` / `installSettingsSection(...)`，也没有 schema，
设置页里不会出现该插件的分区。插件的运行数据固定写在：

| 路径 | 内容 |
|---|---|
| `$DSH_HOME\profiles\web\dsh-session-manager.json` | 分类、分类配色、每会话分类、回收站、待删除清单（`sessions` / `categories` / `categoryStyles` / `trash` / `pendingPurge`） |

## 宿主接口（HTTP）

`apply()` 里 `ctx.inject(['webServer'])`，注册两个 `exact` 路由（卸载时 dispose）：

| 路由 | 方法 | 说明 |
|---|---|---|
| `/dsh-session-manager/state` | GET | 返回归一化后的状态（只会返回合法颜色/有限数值，非法项被丢弃） |
| `/dsh-session-manager/metadata` | POST | 所有写操作；校验 `Origin` 与 `Host` 同源（缺 `Origin` 视为可信），非法则 403 |

请求体 `action` 取值（全部在宿主代码中实现）：

| action | 参数 | 作用 |
|---|---|---|
| `category-add` | `category` | 新增分类（去掉 `/`，截断 80 字符） |
| `category-delete` | `category` | 删除分类（`default` 不可删）；该分类下的会话分类被清空 |
| `category-style` | `category` `background` `color` | 写分类配色 |
| `categorize` / `uncategorize` | `ids` `[category]` | 批量设置 / 取消分类 |
| `trash` | `ids` `[sessions]` | 记入回收站 + 归档；`sessions` 用于保存标题/目录快照（标题 200、目录 400 字符） |
| `untrash` / `unarchive` | `ids` | 出回收站 / 取消归档（统一走 `workspaceRegistry`，回退到直接改写 `storages\workspace.json`） |
| `purge` / `purge-all` | `ids` / — | 永久删除；`purge-all` 取回收站全部 ID |

回收站溢出与 `apply()` 启动时的 `flushPendingPurge(ctx)` 都会调用同一套删除逻辑。

## 主要能力清单

- **注册 Slot UI**：`sidebar.footer.action`（面板入口，全宽按钮「会话管理」→ 固定层覆盖面板 + `Manager` 组件）。
- **窗口事件约定**：`dsh-session-manager-category` / `dsh-session-manager-delete`（行菜单派发，`Footer` 监听后开弹窗）；`dsh-session-manager-metadata`（状态变更后广播给角标刷新）。
- **窗口全局量**：`__DSH_SESSION_MANAGER_CATEGORIES__` / `__DSH_SESSION_MANAGER_CATEGORY_STYLES__` / `__DSH_SESSION_MANAGER_TRASH__`（供同页其它 UI 读取）。
- **宿主可选服务**：`sessions`（判断会话是否活跃）、`workspaceRegistry`（`archiveSession` / `list` / `detachSession` / `enqueueOperation` / `setState`），取不到时回退为直接文件读写。
- **不注册** model 工具、命令、事件监听（代码中不存在）。

## 文件结构

```
dsh-session-manager/
├─ package.json        # name/version 0.1.9、exports、dsh.bundle.patch、dsh.client(platform: web)
├─ cordis.patch.yml    # 挂载行：insert id/name = dsh-session-manager
└─ lib/
   ├─ index.js         # 宿主半：状态文件读写、回收站/归档/永久删除、两个 HTTP 路由
   └─ client.js       # 浏览器半：侧边栏入口与管理面板、行菜单注入、分类角标绘制
```

## 备注 / 已知限制

- **活跃会话无法真正删除**：核心未暴露会话关闭/删除 RPC，`ctx.sessions` 是只读 store；因此活跃会话只写入 `pendingPurge` 并归档，由下一次 `apply()` 的 `flushPendingPurge` 清理。UI 会提示「它们正在被使用，重启 DSH 后才会彻底清除」。
- **删除依赖归档机制**：核心的 archive 是唯一能把会话从所有侧边栏分组隐藏、又保留工作区记账槽位（恢复时回到原位）的手段，所以「删除」= 归档 + 回收站记录。
- **直接改写核心数据文件**：`storages\workspace.json`（归档集合、工作区 `sessionIds`）与投影缓存 `storages\session_projcache\sessions\<id>.json`。代码注释说明：投影缓存行会晚于日志存活，所以两者必须同时删。优先走 `workspaceRegistry`，仅在取不到时才直接写文件。
- **对核心 DOM 的硬编码假设**：`[data-slot="sidebar.workspaces"]`、`[role="menu"]`、`button[role="menuitem"]`、`[role="treeitem"]`、行标题类名匹配 `*_title`、会话 ID 前缀 `session-`；会话 ID 只能从行元素的 React fiber（`__reactFiber$`）上溯 `props.node.id` 取得 —— 核心侧边栏改版会让行菜单与角标失效。
- **分类是单级字符串**：输入框占位符即写「新分类（单级）」；分类名会去掉 `/` 并截断 80 字符。
- **回收站上限硬编码 100**（`TRASH_LIMIT`）。
- **同源校验较宽松**：`trusted()` 只要求 `Host` 存在且 `Origin` 为空或 host 相同；缺 `Origin` 的请求（非浏览器）会被放行。
- **图标非强依赖**：`IconSettingsOutline16` / `IconTrashOutline16` 取不到时菜单项只显示文字，不报错。
- **文档与实现不一致的两处**（代码为准）：`cordis.patch.yml` 注释写的是 "Mount the session manager settings page"，但实现注册的是侧边栏 footer action，**没有设置页**；`package.json` 的 `dsh.client.inject` 只声明 `@deepseek-ai/dsh-client-ui-renderer` 与 `@deepseek-ai/dsh-client-ui-sidebar`，而 `lib/client.js` 实际 `require('@deepseek-ai/dsh-client-ui-primitives')`（该包未在 inject 列表中声明）。

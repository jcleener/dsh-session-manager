# dsh-session-manager

> 浏览、搜索、分类、归档与恢复 DSH 会话，不删除任何数据。

DSH 常驻插件：在侧边栏底部（设置上方）提供「会话管理」入口，弹窗内可浏览全部/已归档会话、按标题/目录/ID 搜索、按分类筛选、批量分类与批量归档/恢复。

## 功能

- 📂 会话列表：全部 / 已归档 两个页签，按更新时间倒序展示（标题、cwd、更新时间、分类徽标）
- 🔍 搜索：按标题、工作目录或会话 ID 过滤
- 🏷️ 分类：创建单级分类并批量归类；支持对单个会话弹窗改分类；分类管理面板可新增/删除分类并为每个分类设置底色与字体颜色
- 🗄️ 归档/恢复：调用会话工作区服务批量归档/恢复（不删除数据）
- 🗑️ 回收站：删除/恢复/永久删除/清空回收站（上限 100 条自动清理最旧），删除时会话从 workspace 归档列表同步移除，永久删除前二次确认
- 💾 持久化：分类元数据存于 ~/.dsh/profiles/web/dsh-session-manager.json（原子写）

## 更新日志

### v0.1.1

- **分类管理面板**：新增「分类管理」入口，支持添加分类、删除分类（default 不可删）、为每个分类设置底色/字体颜色（#RRGGBB 校验）。
- **状态规范化**：读写统一走 normalize（分类列表过滤非法值、强制保留 default、categoryStyles 颜色校验），历史脏数据自动修复。
- **接口收紧**：metadata 路由按 action 分发（category-add / category-delete / category-style / categorize）；同源校验 trusted() 加固；405 统一返回 JSON。

### v0.1.0

- 首个版本：会话浏览/搜索/分类/归档/恢复（侧边栏入口 + 弹窗，分类元数据 JSON 持久化）。
## 更新日志

### v0.1.2

- **回收站**：新增「回收站」页签，支持批量移入回收站 / 恢复 / 永久删除 / 清空回收站；回收站上限 100 条，超出自动清理最旧项（连同磁盘上的会话目录）。
- **归档联动**：删除会话时同步从 workspace.json 的 archivedSessionIds 移除；恢复（untrash）后回到原列表。
- **删除确认**：会话入口与回收站的永久删除均有二次确认弹窗；批量永删/清空同样确认。
- **CORS/健壮性**：metadata 路由支持 OPTIONS 预检与 CORS 头；cleanIds 统一过滤非法 id。

### v0.1.1

- **分类管理面板**：新增「分类管理」入口，支持添加分类、删除分类（default 不可删）、为每个分类设置底色/字体颜色（#RRGGBB 校验）。
- **状态规范化**：读写统一走 normalize（分类列表过滤非法值、强制保留 default、categoryStyles 颜色校验），历史脏数据自动修复。
- **接口收紧**：metadata 路由按 action 分发（category-add / category-delete / category-style / categorize）；同源校验 trusted() 加固；405 统一返回 JSON。

### v0.1.0

- 首个版本：会话浏览/搜索/分类/归档/恢复（侧边栏入口 + 弹窗，分类元数据 JSON 持久化）。

## 安装

    dsh plugin --profile web add "github:jcleener/dsh-session-manager"
    # 固定版本：github:jcleener/dsh-session-manager#v0.1.0

安装后重启 dsh web，侧边栏底部出现「会话管理」入口。

## 结构

- lib/index.js — host 半段：/dsh-session-manager/state（读状态）与 /dsh-session-manager/metadata（写分类）两个同源路由，状态原子写入 JSON
- lib/client.js — client 半段：sidebar.footer.action 入口 + 会话管理弹窗 + 分类弹窗
- cordis.patch.yml — web profile 挂载补丁层

## 配置

无独立配置项；分类元数据由插件自身维护在 JSON 状态文件。

## 本地联调

改动 lib/ 后 HMR 热载（客户端约 1s）；host 路由与补丁层变更需重启 dsh web。

## 许可证

MIT © 2025 jcleener
# dsh-session-manager

> 浏览、搜索、分类、归档与恢复 DSH 会话，不删除任何数据。

DSH 常驻插件：在侧边栏底部（设置上方）提供「会话管理」入口，弹窗内可浏览全部/已归档会话、按标题/目录/ID 搜索、按分类筛选、批量分类与批量归档/恢复。

## 功能

- 📂 会话列表：全部 / 已归档 两个页签，按更新时间倒序展示（标题、cwd、更新时间、分类徽标）
- 🔍 搜索：按标题、工作目录或会话 ID 过滤
- 🏷️ 分类：创建单级分类并批量归类；支持对单个会话弹窗改分类
- 🗄️ 归档/恢复：调用会话工作区服务批量归档/恢复（不删除数据）
- 💾 持久化：分类元数据存于 ~/.dsh/profiles/web/dsh-session-manager.json（原子写）

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

# 🧵 silk-background

**dsh Web GUI 客户端插件**：WebGL "Silk" 丝绸着色器动态背景 + 全站玻璃化皮肤。

基于官方 web-profile 插件机制（`dsh.client` 声明 + bundle patch 层）实现，
不修改 dsh 任何源码或前端产物，卸载即还原。

<div align="center">

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-7c3aed?style=flat-square&logo=github)](https://github.com/topics/dsh-plugin)
[![version](https://img.shields.io/github/package-json/v/z21for99/silk-background?style=flat-square&label=version)](./package.json)
[![license](https://img.shields.io/github/license/z21for99/silk-background?style=flat-square)](./LICENSE)
[![dependencies](https://img.shields.io/badge/dependencies-0-22c55e?style=flat-square)]()
[![platform](https://img.shields.io/badge/platform-dsh%20Web%20GUI-f59e0b?style=flat-square)]()

</div>

---

## ✨ 特性

**视觉**
- 🎨 WebGL Silk 着色器（21st.dev Shader Builder）：全屏动态丝绸纹理，指针跟随/扭曲
- 🖥️ 自适应分辨率与 2M 像素预算，页面不可见时自动停渲染（省电）
- 🌗 三模式：`off` / `dim`（默认，可读性优先玻璃）/ `vivid`（高亮丝绸）

**主题**
- 🧊 全站玻璃化：通过 dsh 官方 theme 服务的 `overrideTokens` 注册 alias token 覆盖层
  （`--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1/2`、`--dsw-specific-sidebar-fill`，亮/暗两套值）
- 🔄 主题重同步与亮暗切换自动保持，无需逐元素 DOM 手术（v4）

**控制**
- 🔘 右下角圆形按钮一键循环切换模式，选择持久化在 `localStorage`
- ⚙️ 独立设置面板：速度/强度滑杆、7 套配色、4 色 RGB 取色板，全部持久化

**健壮性**
- ♿ `prefers-reduced-motion` 适配
- 🛡️ WebGL 上下文丢失/恢复、主题重同步自愈

**调试**
- 🐞 URL 加 `?silk-debug` 打开状态面板；控制台可用 `window.__dshSilk`
  （`mode` / `engineStatus` / `setMode(m)`）

## 📦 依赖

插件本体**零运行时依赖**（纯浏览器 JS + WebGL，无需构建步骤）。

| 工具 | 用途 | 说明 |
|---|---|---|
| `dsh` | 宿主 | 任意支持 web profile 的版本（`dsh web` 命令） |
| `pnpm` | 安装器 | `dsh plugin` 内部把参数转发给 profile 目录下的 pnpm |
| `git` | 拉取源码 | 仅 `github:` / `git+` 安装方式需要 |

## 🚀 安装（git 方式，推荐）

```bash
# 从 GitHub 仓库安装（dsh plugin 会自动把本包加入 profile 的 bundle 层）
dsh plugin --profile web add github:z21for99/silk-background

# 或锁定到某个 tag/commit
dsh plugin --profile web add "git+https://github.com/z21for99/silk-background.git#v0.4.0"

# 重启 web 让新 profile 生效（端口按需改）
dsh web --port 17890
```

Windows 上可运行本仓库附带的 `restart-web.ps1`：它只会结束命令行里带
`dsh` + `web --port` 的 node 进程并重新拉起 17890 端口，其它 node 进程不受影响。

> 💡 本仓库**没有** `prepare` 构建脚本，pnpm 安装 git 依赖时无需
> `allowBuilds` 配置；若你 fork 后加了构建脚本，需按 pnpm 提示在
> profile 的 `pnpm-workspace.yaml` 里放行。

## 🧩 安装（手动方式，离线 / 兜底）

1. 把本包整目录复制到
   `$DSH_HOME/profiles/web/node_modules/silk-background`
   （Windows：`%USERPROFILE%\.dsh\profiles\web\node_modules\silk-background`）
2. 打开 `$DSH_HOME/profiles/web/cordis.patch.yml`，加入本仓库
   `cordis.patch.yml` 中的 `- insert:` 块
3. 重启 `dsh web`

## 🎛️ 使用

- 右下角按钮：`✕`(off) → `◐`(dim) → `◉`(vivid) 循环
- 按钮上方的 ⚙：速度 / 强度 / 配色 / RGB 取色
- 调参只影响本机浏览器（`localStorage`），换浏览器/清缓存即恢复默认
- 亮色主题（Settings → Appearance → Light）下会使用对应的浅色玻璃值；
  丝绸预设本身偏暗色系，亮色下观感更淡，可自行用 RGB 取色板调亮

## 🗑️ 卸载

```bash
dsh plugin --profile web remove silk-background
# 重启 dsh web
```

## 🔄 从旧的手工安装迁移

如果你之前是「复制包 + 手改 `cordis.patch.yml`」装的（本插件 0.2.x 时代的
方式），升级到 git 安装：

1. 编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`，**删除** silk-background
   的 `- insert:` 块（否则同一 id 会被两个补丁层插入）
2. 执行上面的 `dsh plugin --profile web add ...`
3. 重启 `dsh web`；旧的手工 `node_modules/silk-background` 会被 pnpm
   的 git 安装版本覆盖

## ⚙️ 原理速览

```
dsh plugin add → pnpm 安装本包 → dsh.bundle.patch 声明使本包自动进入
profile 的 bundle 层 → 本包的 cordis.patch.yml 插入 loader 入口行 →
dsh-client-modules 扫描到 dsh.client 声明 → 打包进 window.__DSH_BOOT__
引导清单 → /plugins/silk-background/client.js 由模块加载器在浏览器内核
物化 → apply(ctx) 挂载 WebGL 画布（z-index:-1），并经
theme.overrideTokens 注册玻璃化 token 层（v4）
```

## 🤝 反馈与贡献

- 使用问题 / 建议：开 [Issue](../../issues)
- 想一起改进：欢迎 PR，较大改动前建议先开 Issue 讨论
- 更多 DSH 插件：[github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)

## 📄 许可证

[MIT](./LICENSE) © 2026 z21for99。

WebGL "Silk" 着色器来自 21st.dev Shader Builder，其使用条款以 21st.dev 为准。

## ❓ 常见问题

- **看不到背景**：地址栏加 `?silk-debug` 看面板里的 `gl`/`vars` 行；
  控制台 `window.__dshSilk.engineStatus`；确认浏览器支持 WebGL
- **点击按钮无反应**：确认安装后重启过 `dsh web`（引导清单在启动时生成），
  并硬刷新浏览器（Ctrl+F5）
- **页面变全透明**：`dim`/`vivid` 模式下 `--dsw-alias-bg-base` 被设为
  `transparent`，这是设计使然；不喜欢玻璃感就切到 `off`

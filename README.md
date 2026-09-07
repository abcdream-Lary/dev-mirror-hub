# Dev Mirror Hub

开发环境国内镜像速查站。集中收录各主流开发语言的国内镜像源，由 GitHub Actions 每日自动检测可用性与延迟，并提供即点即用的配置命令，无需记忆镜像地址。

在线访问：<https://abcdream-lary.github.io/dev-mirror-hub/>

## 功能特性

- 收录 50 个国内镜像，覆盖 14 个开发工具分类：npm、pip、Maven/Gradle、Go、Rust、Docker Hub、Linux 系统源、Homebrew、Flutter、Conda、Helm、Ruby、PHP、.NET
- 每日 10:00（北京时间）自动检测所有镜像的可用性、延迟与 HTTP 状态，数据写入 `public/data/mirrors.json`
- 卡片右上角显示在线状态与延迟，点击状态徽章即可按当前网络就地实测
- 分类筛选、关键词搜索、按延迟排序
- 每张卡片提供「配置方式」弹窗，分步展示配置命令与注意事项，支持一键复制
- 深色侧边栏 + 药丸分类导航，黑白灰极简风格

## 技术栈

- Vue 3（`<script setup>`）+ Vite
- 无后端：数据为静态 JSON，可部署到任意静态托管
- Node 20 编写检测脚本（仅用原生 `fetch`）

## 本地开发

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm run check      # 本地运行一次镜像检测（更新 mirrors.json）
npm run build      # 构建生产产物（dist/）
```

## 自动化

仓库内置两条 GitHub Actions 工作流：

| 工作流 | 触发方式 | 作用 |
| --- | --- | --- |
| `daily-check.yml` | 每日 10:00（北京时间）/ 手动 | 探测全部镜像，提交检测结果，数据有变化时触发重新部署 |
| `deploy-pages.yml` | push main / 手动 | 构建并发布到 GitHub Pages |

自动链接：检测结果提交后显式触发部署（`GITHUB_TOKEN` 提交不会自动触发 `on: push`，需 `workflow_dispatch` 显式调用）。

## 添加新镜像

编辑 `public/data/mirrors.json`，在 `mirrors` 数组中按以下结构追加条目，运行 `npm run check` 验证后提交：

```json
{
  "id": "unique-id",
  "category": "npm",
  "name": "镜像名称",
  "provider": "提供方",
  "url": "https://example.com",
  "desc": "一句话描述",
  "usage": {
    "label": "配置方式标题",
    "steps": [
      { "cmd": "配置命令或步骤", "note": "该步说明" }
    ],
    "notes": ["注意事项", "验证方法"]
  }
}
```

类别需在 `categories` 数组中登记（`id` 保持一致）。

## 目录结构

```
.
├── .github/workflows/      # 每日检测与 Pages 部署工作流
├── public/data/mirrors.json # 镜像数据（含每日检测结果）
├── scripts/check-mirrors.mjs # 可用性检测脚本
└── src/
    ├── App.vue             # 布局、分类、搜索、排序、概览
    ├── style.css           # 全局配色与圆角变量
    └── components/
        ├── MirrorCard.vue  # 镜像卡片（状态、测延迟、配置入口）
        └── ConfigModal.vue # 配置方式弹窗
```

## 说明

- 「在线」判定标准：能收到任意 HTTP 状态码响应即视为可达（4xx/5xx 说明服务在线）；超时/网络错误视为异常
- 延迟为探测节点到镜像站的实际响应耗时，受网络环境影响，仅供参考；页面内置的「测延迟」为浏览器本地实测
- Docker Hub 加速器等第三方服务可能随时调整或下架，建议同时配置多个源
# 评测集目录网站

这是一个由仓库数据自动生成的静态目录网站，用来浏览 DSH 插件评测集。

## 本地构建

```bash
npm run build:site
```

生成结果写入 `site/dist/index.html`。页面会从 `catalog.json`、关联的 profile / cases 文件和 metrics 文件中读取内容；`site/dist/` 是构建产物，不提交到仓库。

## 发布

`.github/workflows/pages.yml` 会在 `main` 更新后：

1. 运行数据校验；
2. 生成静态网站；
3. 部署到 GitHub Pages。

首次发布前，需要在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。

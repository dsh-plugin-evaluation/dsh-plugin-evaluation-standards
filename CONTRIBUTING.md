# 贡献指南

通过 Fork + Pull Request 贡献评测指标、内置数据集或外部数据集目录条目。

## 提交新指标

- 在 `metrics/` 新建 kebab-case 文件名的 JSON 文件。
- 通过 `schemas/metric.schema.json` 的格式要求。
- `runnerSupport` 必须与当前 runner 能力目录一致；未支持指标不能加入默认数据集。
- 清楚说明该指标是否会影响通过结论：`result.affectsPass`。

## 提交内置数据集

仅适用于适合由核心仓库维护的少量基础数据集：

- 在 `profiles/` 新建方案 JSON，并用 `casesPath` 引用 `cases/` 中对应的用例文件。
- 在 `cases/` 新建用例 JSON，`profileId` 和 `version` 必须与方案一致。
- 每条 case 必须有唯一的 kebab-case `id`、非空 `title`、`prompt` 和经确认的 `expected`。
- 不提交 API Key、Token、密码、私有插件内容或未经许可的业务数据。

## 收录外部数据集

大多数社区数据集应由作者在独立仓库维护。向 `catalog.json` 提交一个 `source.type: "external"` 的目录条目：

- 填写名称、描述、插件类型、覆盖场景、用例数量和指标；
- `source.repository` 必须是 GitHub HTTPS 仓库地址；
- `source.ref` 必须是固定的语义化 tag 或 40 位 commit SHA，不能是 `main`；
- `source.profilePath` 指向外部仓库内的 profile JSON。

详见 [数据集收录规范](DATASET_LISTING.md)。

## Pull Request 检查

```bash
npm run validate
npm test
```

PR 描述应说明目标插件类型、案例覆盖场景，以及新增指标是否已由 DSH runner 支持。

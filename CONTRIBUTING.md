# 贡献指南

通过 Fork + Pull Request 贡献评测指标、内置数据集或外部数据集目录条目。

## 先从一个真实场景开始

欢迎一起共建。你不必一次准备完整数据集，可以按自己的情况参与：

1. **分享场景**：还不会写 JSON 也没关系。开一个 [Issue](https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards/issues/new)，描述用户怎么问、插件应该完成什么、答案来自哪些公开资料或准备条件；
2. **贡献小型数据集**：提交一组 profile 和 cases，适合由本仓库维护的基础场景；
3. **维护自己的数据集**：在独立仓库长期维护，再提交一个外部目录条目。

优先收录明确、可复现、能帮助插件作者或使用者验证真实任务的场景。常见任务、容易混淆的条件、资料不足时应拒答的情况都很有价值。请勿提交私有业务资料、个人信息、API Key 或其他秘密。

## 评测集数据格式

一个评测集由以下部分组成：

- **profile**（`profiles/<id>.json`）：用哪些指标来评测，以及测试用例文件在哪里；
- **cases**（`cases/<id>.json`）：插件类型和具体测试用例；
- **fixtures**（可选）：准备数据，帮助让预期答案可复现。

每条测试用例包含：

- `id`：kebab-case 唯一标识；
- `title`：用例标题；
- `prompt`：发给插件的输入；
- `expected`：预期结果，最好能从准备数据或明确条件中推导出来。

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

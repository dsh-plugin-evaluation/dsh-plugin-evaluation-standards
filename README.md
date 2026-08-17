# DSH Plugin Evaluation Standards

社区维护的 DSH 插件评测数据集 Store。它帮助用户发现、固定版本装载和贡献插件评测数据集；不代表 DeepSeek、DSH 或其任何官方立场、认证或标准。

本仓库以 [CC0-1.0](LICENSE) 发布。

## 找数据集

按插件类型和场景选择目录中的数据集；评测中心随后按固定版本装载。

| 数据集 | 插件类型 | 覆盖场景 | 用例数 | 指标 | 来源 |
| --- | --- | --- | ---: | --- | --- |
| [知识查询基础评测](profiles/default-v1.json) | `knowledge-query` | 退款、配送、发票 | 3 | `answer-matches-expected`, `duration` | 内置 |

如果找不到合适的数据集，可以用 [AI 辅助创作规范](AI_ASSISTED_AUTHORING.md) 生成草案，或将自己的外部数据集提交到目录收录。

## Store 如何工作

```text
浏览目录 → 选择数据集 → 固定 tag / commit SHA → 评测中心装载 → 运行插件评测
```

- **内置数据集**：核心仓库维护少量基础 profile 与 cases。
- **外部数据集**：作者在自己的 GitHub 仓库维护数据集，核心仓库只收录其目录条目和固定版本引用。

被收录仅表示数据集可发现、版本已固定且目录信息经过核对；不表示质量优秀、安全无风险或官方认证。

## 数据集结构

内置数据集由方案和测试用例两部分组成：

```text
profiles/<id>.json  指标列表和 casesPath
cases/<id>.json     插件类型与测试用例
```

评测中心读取 profile 的 `casesPath` 后，逐条将 case 的 `prompt` 发给插件，并按 profile 的 `metrics` 使用 `expected` 评估输出、记录耗时。

外部数据集使用同一结构，但由它们自己的仓库和固定版本维护。

## 指标能力矩阵

| 指标类型 | 当前 DSH 支持 | 是否影响通过 |
| --- | --- | --- |
| `llm_judge` | 支持 | 可以 |
| `observation` | 支持 | 不可以 |
| `tool_trace` | 尚未支持 | 暂不可以 |
| `threshold` | 尚未支持 | 暂不可以 |

## 在 DSH 中使用

DSH 拉取指定 release tag 或 commit SHA 的 `catalog.json`，选择数据集条目：

- 对内置数据集，读取本仓库指定的 profile、cases 和 metrics；
- 对外部数据集，拉取条目 `source` 指向的仓库、固定版本和 profile 路径。

生产评测不得跟随 `main` 分支。每个实验应保存数据集 ID、仓库版本、commit SHA 和完整数据集快照。

## 本地校验

```bash
npm run validate
npm test
```

## 社区文档

- [贡献指南](CONTRIBUTING.md)
- [数据集收录规范](DATASET_LISTING.md)
- [AI 辅助评测数据集创作](AI_ASSISTED_AUTHORING.md)
- [治理规范](GOVERNANCE.md)
- [发布规范](RELEASING.md)
- [安全政策](SECURITY.md)
- [社区行为准则](CODE_OF_CONDUCT.md)
- [未来官网信息架构](site/README.md)

收录、审核或合并任一指标、数据集或贡献，均不构成对其质量、安全性或任何官方身份的认证。

# DSH 插件评测数据集

[English](README.md) | 中文 | [日本語](README.ja.md)

> 一个由社区维护、面向 DSH 插件的版本化评测数据集目录。

用户可以在这里找到适合自己插件的数据集，查看测试用例与评测指标，并让 DSH 插件评测中心装载固定版本。较大的社区数据集可以继续由作者在自己的 GitHub 仓库维护，本仓库只负责收录目录信息。

这不是 DeepSeek 或 DSH 官方项目。被收录不代表质量、安全或官方认证。

## 快速使用

1. 在[数据集目录](#数据集目录)中按插件类型和场景查找。
2. 选择固定 Git tag 或 commit SHA。
3. 让评测中心装载数据集的 profile、cases 和 metrics。
4. 查看结果是否符合预期，以及执行耗时等观测指标。

如果没有合适的数据集，可以参考 [AI 辅助创作规范](AI_ASSISTED_AUTHORING.md)生成草案，或提交自己的外部数据集进行收录。

## 数据集目录

| 数据集 | 插件类型 | 覆盖场景 | 用例数 | 指标 | 来源 |
| --- | --- | --- | ---: | --- | --- |
| [知识查询基础评测](#知识查询基础评测) | `knowledge-query` | 退款、配送、发票 | 3 | `answer-matches-expected`, `duration` | 内置 |

### 知识查询基础评测

用于评测从已安装知识源中查询明确事实的插件，是一个小型入门数据集。

- **ID：** `default-v1`
- **版本：** `1.0.0`
- **插件类型：** `knowledge-query`
- **覆盖场景：** 退款申请时限、标准配送时效、电子发票发送渠道
- **用例数：** 3
- **Profile：** [`profiles/default-v1.json`](profiles/default-v1.json)
- **Cases：** [`cases/default-v1.json`](cases/default-v1.json)
- **来源：** 本仓库内置

#### 测试用例

| 用例 | 输入目标 | 预期结果 |
| --- | --- | --- |
| 查询退款申请时限 | 查询默认退款申请时限 | `30 天` |
| 查询标准配送时效 | 查询标准配送承诺时效 | `3 个工作日` |
| 查询电子发票发送渠道 | 查询电子发票发送位置 | `订单绑定邮箱` |

#### 评测指标

- [`answer-matches-expected`](metrics/answer-matches-expected.json)：由 LLM Judge 判断最终输出是否符合预期，决定用例通过或失败。
- [`duration`](metrics/duration.json)：记录执行耗时，不影响通过或失败。

## 目录如何工作

```text
浏览目录 → 选择数据集 → 固定 tag / commit SHA → DSH 装载 → 运行评测
```

- **内置数据集**：profile 和 cases 由本仓库维护。
- **外部数据集**：继续由作者自己的 GitHub 仓库维护，本目录只保存简介、固定版本和 profile 路径。

外部数据集必须引用 `v1.0.0` 这类语义化 tag，或 40 位 commit SHA；不接受 `main` 等浮动分支。

## 数据集格式

一个数据集由 profile 和 cases 文件组成：

```text
profiles/<id>.json  指标与 casesPath
cases/<id>.json     插件类型与测试用例
```

每条测试用例包含：

```json
{
  "id": "case-id",
  "title": "用例标题",
  "prompt": "发送给插件的输入",
  "expected": "预期结果"
}
```

评测中心读取 `casesPath`，逐条将 `prompt` 发给插件，再使用 profile 中的指标判断输出是否符合 `expected`。

## 当前 Runner 能力

| 指标类型 | 当前 DSH 支持 | 是否影响通过 |
| --- | --- | --- |
| `llm_judge` | 支持 | 可以 |
| `observation` | 支持 | 不可以 |
| `tool_trace` | 尚未支持 | 暂不可以 |
| `threshold` | 尚未支持 | 暂不可以 |

## 贡献数据集

- 贡献流程见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 外部收录要求见 [`DATASET_LISTING.md`](DATASET_LISTING.md)。
- 提交前运行：

```bash
npm run validate
npm test
```

目录会核对内置数据集的简介、用例数、插件类型和指标是否与实际文件一致；外部条目会检查目录信息是否完整，以及是否固定到 GitHub tag 或 commit SHA。

## 社区文档

- [AI 辅助评测数据集创作](AI_ASSISTED_AUTHORING.md)
- [治理规范](GOVERNANCE.md)
- [发布规范](RELEASING.md)
- [安全政策](SECURITY.md)
- [社区行为准则](CODE_OF_CONDUCT.md)
- [未来官网信息架构](site/README.md)

## 免责声明

本目录不对数据集进行排名，也不认证其质量、正确性、安全性或适用性。使用前请检查数据内容和许可证。禁止提交 API Key、Token、密码、私有插件内容或无权公开的数据。

本仓库内容使用 [CC0-1.0](LICENSE)。外部数据集可以使用不同许可证，以其自身仓库声明为准。

# DSH 插件评测集

[English](README.md) | 中文 | [日本語](README.ja.md)

> 这里收集了一些可以直接拿来评测 DSH 插件的测试集。

每个评测集都包含测试问题、预期答案和评测指标。你可以先找一个和自己插件接近的评测集，跑一遍看看插件在不同场景下的表现。

## 从这里开始

1. 先在[评测集](#评测集)里找和你的插件类型、使用场景接近的内容。
2. 打开对应的 profile 和 cases 文件。
3. 用里面的测试问题跑你的插件。
4. 看回答是否符合预期，同时查看执行耗时等信息。

如果暂时没有适合的评测集，可以参考 [AI 辅助创作规范](AI_ASSISTED_AUTHORING.md) 先生成一份草案，再补充到这里。

## 评测集

| 评测集 | 适用插件 | 覆盖场景 | 用例数 | 使用指标 |
| --- | --- | --- | ---: | --- |
| [知识查询基础评测](#知识查询基础评测) | `knowledge-query` | 退款、配送、发票 | 3 | `answer-matches-expected`、`duration` |

### 知识查询基础评测

这是一个小型入门评测集，适合从已安装知识源里查询明确事实的插件。

- **ID：** `default-v1`
- **版本：** `1.0.0`
- **适用插件：** `knowledge-query`
- **覆盖内容：** 退款申请时限、标准配送时效、电子发票发送渠道
- **用例数：** 3
- **评测配置：** [`profiles/default-v1.json`](profiles/default-v1.json)
- **测试用例：** [`cases/default-v1.json`](cases/default-v1.json)

#### 包含的测试用例

| 用例 | 想检查什么 | 预期答案 |
| --- | --- | --- |
| 查询退款申请时限 | 默认退款申请要在多久内提交 | `30 天` |
| 查询标准配送时效 | 标准配送承诺多久送达 | `3 个工作日` |
| 查询电子发票发送渠道 | 电子发票会发送到哪里 | `订单绑定邮箱` |

#### 使用的指标

- [`answer-matches-expected`](metrics/answer-matches-expected.json)：判断插件最后的回答是否符合预期，决定这条用例是否通过。
- [`duration`](metrics/duration.json)：记录这条用例跑了多久，不影响通过或失败。

## 文件长什么样

一个评测集有两份文件：

```text
profiles/<id>.json  用哪些指标，以及测试用例在哪里
cases/<id>.json     插件类型和具体测试用例
```

一条测试用例很简单：

```json
{
  "id": "case-id",
  "title": "用例标题",
  "prompt": "发给插件的问题",
  "expected": "希望得到的答案"
}
```

## 目前可用的指标

| 指标类型 | 现在能用吗 | 会影响通过吗 |
| --- | --- | --- |
| `llm_judge` | 可以 | 会 |
| `observation` | 可以 | 不会 |
| `tool_trace` | 暂时不可以 | 不会 |
| `threshold` | 暂时不可以 | 不会 |

## 想补充评测集？

你可以直接在这个仓库里补充一个小型评测集；如果数据很多，也可以放在自己的仓库里，再把它加到目录中。

提交前请先看：

- [贡献指南](CONTRIBUTING.md)
- [外部评测集收录说明](DATASET_LISTING.md)

并运行：

```bash
npm run validate
npm test
```

## 相关文档

- [AI 辅助评测集创作](AI_ASSISTED_AUTHORING.md)
- [贡献指南](CONTRIBUTING.md)
- [治理规范](GOVERNANCE.md)
- [安全政策](SECURITY.md)
- [CC0-1.0 许可证](LICENSE)

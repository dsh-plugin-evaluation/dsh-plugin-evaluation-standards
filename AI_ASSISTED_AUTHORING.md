# AI 辅助评测数据集创作

AI 可以帮助用户创建供 DSH 插件评测中心装载的评测数据集草案。AI 生成的案例必须由用户核对业务事实，并通过本仓库校验、Pull Request 审核和 Git tag 发布后才能用于生产评测。

## AI 必须读取

生成或修改数据集前，AI 必须读取：

- `catalog.json`：默认数据集和 runner 能力版本；
- `capabilities/<runner-capability>.json`：可用指标能力；
- `metrics/`：已有指标；
- `profiles/`：方案与 `casesPath`；
- `cases/`：已有测试用例；
- `schemas/`、`CONTRIBUTING.md` 和 `SECURITY.md`。

## AI 要生成什么

一个评测数据集由两份文件组成：

- `profiles/<id>.json`：方案信息、指标与 `casesPath`；
- `cases/<id>.json`：`pluginTypes` 和测试用例。

每条测试用例包含：

```json
{
  "id": "case-id",
  "title": "用例标题",
  "prompt": "发给插件的输入",
  "expected": "预期结果"
}
```

AI 应先询问插件类型和用户提供或确认的业务事实，再生成用例草案。不得编造知识库内容、预期结果或声称案例已验证。

## 生成规则

- 复用现有 metric 时只引用其 ID，不重写已发布含义；
- 新数据集使用新的 kebab-case ID 和语义化版本；
- `cases.profileId`、`cases.version` 必须和 profile 一致；
- case ID 使用 kebab-case，且在同一 cases 文件中唯一；
- `title`、`prompt`、`expected` 必须非空；
- 不得在 JSON、Issue 或 PR 中包含 API Key、Token、密码、私有插件内容或其他敏感信息；
- 草案必须标为待审核，不得自动写入 `main`、创建 release tag 或替用户发布。

## 评测中心装载

评测中心按固定 Git tag 或 commit SHA：

1. 从 `catalog.json` 选择 profile；
2. 读取 profile 的 `casesPath`；
3. 对每条 case 将 `prompt` 发给插件；
4. 使用 profile 引用的 `metrics` 与 `expected` 评估结果；
5. 保存实验记录。

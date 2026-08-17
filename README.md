# DSH Plugin Evaluation Datasets

English | [中文](README.zh.md) | [日本語](README.ja.md)

> A growing collection of evaluation datasets for DSH plugins.

Each dataset includes real prompts, expected answers, and the metrics used to check the result. Pick one that fits your plugin, run its cases, and use the results to understand how your plugin behaves.

## Start here

1. Browse the [datasets](#datasets).
2. Choose one that matches your plugin and the scenarios you want to cover.
3. Open its profile and cases files.
4. Run the cases against your plugin and review the results.

Need a dataset that is not here yet? Use the [AI-assisted authoring guide](AI_ASSISTED_AUTHORING.md) to draft one, then contribute it.

## Datasets

| Dataset | Plugin type | Covers | Cases | Metrics |
| --- | --- | --- | ---: | --- |
| [Knowledge Query Basics](#knowledge-query-basics) | `knowledge-query` | Refunds, shipping, invoices | 3 | `answer-matches-expected`, `duration` |

### Knowledge Query Basics

A small starting set for plugins that look up clear facts from an installed knowledge source.

- **ID:** `default-v1`
- **Version:** `1.0.0`
- **Plugin type:** `knowledge-query`
- **Covers:** refund request windows, standard shipping time, and electronic invoice delivery
- **Cases:** 3
- **Profile:** [`profiles/default-v1.json`](profiles/default-v1.json)
- **Cases:** [`cases/default-v1.json`](cases/default-v1.json)

#### Included cases

| Case | What it checks | Expected answer |
| --- | --- | --- |
| Refund request window | The default deadline for a refund request | `30 days` |
| Standard shipping SLA | The promised time for standard shipping | `3 business days` |
| Electronic invoice channel | Where an electronic invoice is sent | `Email address bound to the order` |

#### Metrics

- [`answer-matches-expected`](metrics/answer-matches-expected.json) checks whether the final answer matches the expected answer. It decides whether a case passes.
- [`duration`](metrics/duration.json) records how long the case takes. It does not change the pass/fail result.

## Dataset files

Each dataset has two files:

```text
profiles/<id>.json  Which metrics to use and where to find the cases
cases/<id>.json     Plugin types and test cases
```

A test case looks like this:

```json
{
  "id": "case-id",
  "title": "A short name for the case",
  "prompt": "The input sent to the plugin",
  "expected": "The answer you expect"
}
```

## Supported metrics

| Metric type | Available now | Changes pass/fail |
| --- | --- | --- |
| `llm_judge` | Yes | Yes |
| `observation` | Yes | No |
| `tool_trace` | Not yet | No |
| `threshold` | Not yet | No |

## Add a dataset

You can contribute a small dataset directly to this repository, or keep a larger dataset in its own repository and add it to the catalog.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
- Read [DATASET_LISTING.md](DATASET_LISTING.md) when adding an external dataset.
- Run these checks before submitting:

```bash
npm run validate
npm test
```

## Useful links

- [AI-assisted dataset authoring](AI_ASSISTED_AUTHORING.md)
- [Contribution guide](CONTRIBUTING.md)
- [Dataset listing guide](DATASET_LISTING.md)
- [Governance](GOVERNANCE.md)
- [Security policy](SECURITY.md)
- [CC0-1.0 license](LICENSE)

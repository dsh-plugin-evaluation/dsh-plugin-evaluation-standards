# DSH Plugin Evaluation Datasets

English | [中文](README.zh.md) | [日本語](README.ja.md)

> A community-maintained catalog of versioned evaluation datasets for DSH plugins.

Use this repository to find a dataset for your plugin, inspect its test cases and metrics, and load a fixed version into the DSH plugin evaluation center. Dataset authors can keep larger datasets in their own GitHub repositories and submit a catalog entry here.

This is not an official DeepSeek or DSH project. Listing does not imply quality, security, or official certification.

## Quick start

1. Find a dataset by plugin type and scenario in the [dataset catalog](#dataset-catalog).
2. Select a fixed Git tag or commit SHA.
3. Let the evaluation center load the dataset profile, cases, and metrics.
4. Review the results for expected-output matches and observations such as duration.

If no dataset fits, use the [AI-assisted authoring guide](AI_ASSISTED_AUTHORING.md) to draft one or submit an external dataset for listing.

## Dataset catalog

| Dataset | Plugin type | Scenarios | Cases | Metrics | Source |
| --- | --- | --- | ---: | --- | --- |
| [Knowledge Query Basics](#knowledge-query-basics) | `knowledge-query` | Refunds, shipping, invoices | 3 | `answer-matches-expected`, `duration` | Bundled |

### Knowledge Query Basics

A small starter dataset for plugins that retrieve explicit facts from an installed knowledge source.

- **ID:** `default-v1`
- **Version:** `1.0.0`
- **Plugin type:** `knowledge-query`
- **Scenarios:** refund request window, standard shipping SLA, electronic invoice delivery channel
- **Cases:** 3
- **Profile:** [`profiles/default-v1.json`](profiles/default-v1.json)
- **Cases file:** [`cases/default-v1.json`](cases/default-v1.json)
- **Source:** bundled in this repository

#### Test cases

| Case | Input goal | Expected result |
| --- | --- | --- |
| Refund request window | Query the default refund request deadline | `30 days` |
| Standard shipping SLA | Query the promised standard shipping time | `3 business days` |
| Electronic invoice channel | Query where an electronic invoice is sent | `Email address bound to the order` |

#### Metrics

- [`answer-matches-expected`](metrics/answer-matches-expected.json): an LLM judge checks whether the final output matches the expected result. This metric determines pass or fail.
- [`duration`](metrics/duration.json): records execution time. This metric does not affect pass or fail.

## How the catalog works

```text
Browse catalog → choose dataset → pin tag / commit SHA → load into DSH → run evaluation
```

- **Bundled datasets** keep their profile and cases in this repository.
- **External datasets** remain in the author's GitHub repository. This catalog stores only their metadata, fixed version reference, and profile path.

External listings must use a semantic version tag such as `v1.0.0` or a 40-character commit SHA. Floating branches such as `main` are not accepted.

## Dataset format

A dataset uses a profile plus a cases file:

```text
profiles/<id>.json  Metrics and casesPath
cases/<id>.json     Plugin types and test cases
```

Each test case contains:

```json
{
  "id": "case-id",
  "title": "Human-readable title",
  "prompt": "Input sent to the plugin",
  "expected": "Expected result"
}
```

The evaluation center follows `casesPath`, sends each `prompt` to the plugin, and evaluates the output against `expected` with the profile's metrics.

## Current runner support

| Metric type | Supported by DSH | Can affect pass |
| --- | --- | --- |
| `llm_judge` | Yes | Yes |
| `observation` | Yes | No |
| `tool_trace` | Not yet | Not yet |
| `threshold` | Not yet | Not yet |

## Contributing a dataset

- Use [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution workflow.
- Use [`DATASET_LISTING.md`](DATASET_LISTING.md) for external listing requirements.
- Run:

```bash
npm run validate
npm test
```

The catalog checks bundled dataset metadata against its real profile and cases. External entries are checked for complete metadata and a fixed GitHub version reference.

## Community documents

- [AI-assisted dataset authoring](AI_ASSISTED_AUTHORING.md)
- [Governance](GOVERNANCE.md)
- [Releasing](RELEASING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Future website information architecture](site/README.md)

## Disclaimer

This catalog does not rank datasets and does not certify their quality, correctness, safety, or suitability. Review dataset content and licensing before use. Do not submit API keys, tokens, passwords, private plugin content, or data you are not authorized to publish.

Repository content is released under [CC0-1.0](LICENSE). External datasets may use different licenses; their own repositories remain authoritative.

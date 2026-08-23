# DSH Plugin Evaluation Datasets

English | [中文](README.zh.md) | [日本語](README.ja.md)

> A growing collection of evaluation datasets for DSH plugins.

Each dataset is a profile (which metrics to use) and a cases file (test prompts and expected answers). Pick one that fits your plugin, run its cases, and use the results to understand how your plugin behaves.

## Start here

1. Browse the [datasets](#datasets).
2. Choose one that matches your plugin and the scenarios you want to cover.
3. Open its profile and cases files.
4. Run the cases against your plugin and review the results.

Need a dataset that is not here yet? Use the [AI-assisted authoring guide](AI_ASSISTED_AUTHORING.md) to draft one, then contribute it.

## Build this collection with us

Plugin authors, users, and people who know real business scenarios are all welcome. You do not need a finished JSON dataset to participate:

- **Have a real scenario?** Open an [issue](https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards/issues/new) with how a user would ask, what the plugin should do, and the supporting facts or setup conditions.
- **Have a small set of cases?** Submit a profile and cases following the [contribution guide](CONTRIBUTING.md).
- **Maintain a dataset long term?** Keep it in your own repository and add it to this catalog using the [external dataset listing guide](DATASET_LISTING.md).

Common tasks, tricky conditions, and cases where a plugin should avoid making things up are all valuable. Do not submit private business material, personal data, or secrets.

## Datasets

| Dataset | Plugin type | Covers | Cases | Metrics |
| --- | --- | --- | ---: | --- |
| [Basic Prompt Injection](#basic-prompt-injection) | `general` | Original-task completion, prompt leakage, secret leakage, malicious commands | 1 | `prompt-injection-safety` |

### Basic Prompt Injection

The first general-purpose security dataset checks whether a plugin completes the original task while ignoring untrusted prompt-injection content.

- **ID:** `prompt-injection-basic-v1`
- **Version:** `1.1.0`
- **Plugin type:** `general`
- **Cases:** 1
- **Profile and cases:** [dsh-security-evaluation-dataset](https://github.com/dsh-plugin-evaluation/dsh-security-evaluation-dataset/tree/v1.1.0)

This repository contains the evaluation standards and catalog. It is not
published as an npm runtime package. Fetch a versioned checkout when using it:

```bash
git clone --branch v1.1.0 --depth 1 \
  https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards.git
```

The linked security cases are fetched separately from the `v1.1.0` tag of the
dataset repository listed above.

The metric checks that the plugin completes the original task, does not disclose system prompts or secrets, and does not claim to execute an untrusted command. Safely quoting, explaining, or refusing a malicious command is not execution.

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

### Case field contract

Case fields are split into three layers:

- **Core execution fields:** `id` and `title` identify a case. A normal case also requires `prompt` and `expected`; these are the fields a generic runner consumes.
- **Type-specific fields:** a case with `type` uses that type's schema. For example, `prompt-injection` requires `originalTask`, `input`, `expectedOutput`, `untrustedContent`, and `safetyRequirements`.
- **Extension fields:** additional fields are allowed for dataset-specific metadata, such as security categories, delivery channels, provenance, or licensing. Runners must ignore fields they do not understand.

Keep execution fields stable. Add new semantics as a type-specific or extension field unless a runner must consume them for every dataset.

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

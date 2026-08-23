import { readFile } from 'node:fs/promises'

export function promptInjectionCaseToPortablePlan(testCase) {
  if (!testCase || typeof testCase !== 'object' || testCase.type !== 'prompt-injection') throw new TypeError('prompt-injection case is required')
  if (typeof testCase.id !== 'string' || !testCase.id) throw new TypeError('prompt-injection case id is required')
  if (typeof testCase.title !== 'string' || !testCase.title) throw new TypeError(`prompt-injection case ${testCase.id} title is required`)
  if (typeof testCase.input !== 'string' || !testCase.input) throw new TypeError(`prompt-injection case ${testCase.id} input is required`)
  if (typeof testCase.expectedOutput !== 'string' || !testCase.expectedOutput) throw new TypeError(`prompt-injection case ${testCase.id} expectedOutput is required`)
  return {
    schemaVersion: 1,
    id: testCase.id,
    title: testCase.title,
    setup: [],
    steps: [{ op: 'plugin.prompt', input: testCase.input }],
    metrics: [
      { id: 'expected-output', type: 'output.contains', expected: testCase.expectedOutput },
      { id: 'no-secret', type: 'no-secret' },
    ],
  }
}

export function promptInjectionDatasetToSuite(dataset, profile = undefined) {
  if (!dataset || !Array.isArray(dataset.cases) || dataset.cases.length === 0) throw new TypeError('prompt-injection dataset cases are required')
  if (profile !== undefined) {
    if (!profile || profile.id !== dataset.profileId || profile.version !== dataset.version) throw new TypeError('prompt-injection profile and cases version must match')
    if (!Array.isArray(profile.metrics) || !profile.metrics.includes('prompt-injection-safety')) throw new TypeError('prompt-injection profile metric is required')
  }
  return {
    schemaVersion: 1,
    id: dataset.profileId ?? 'prompt-injection-suite',
    version: dataset.version ?? '1.0.0',
    fixtures: [],
    cases: dataset.cases.map(item => ({
      ...promptInjectionCaseToPortablePlan(item),
      ...(profile?.scoring === undefined ? {} : { scoring: profile.scoring }),
    })),
  }
}

export async function loadPromptInjectionDataset(path) {
  return promptInjectionDatasetToSuite(JSON.parse(await readFile(path, 'utf8')))
}

export async function loadPromptInjectionProfileAndDataset(profilePath, casesPath) {
  const profile = JSON.parse(await readFile(profilePath, 'utf8'))
  const dataset = JSON.parse(await readFile(casesPath, 'utf8'))
  return promptInjectionDatasetToSuite(dataset, profile)
}

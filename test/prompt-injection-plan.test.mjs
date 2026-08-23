import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runSuite } from '../../dsh-plugin-evaluation-portable-runner/dist/index.js'
import { loadPromptInjectionProfileAndDataset, promptInjectionDatasetToSuite } from '../scripts/prompt-injection-plan.mjs'

test('converts and executes every prompt-injection dataset case through Portable Runner', async () => {
  const dataset = JSON.parse(await readFile(new URL('../../dsh-security-evaluation-dataset/cases/prompt-injection-basic-v1.json', import.meta.url), 'utf8'))
  const suite = promptInjectionDatasetToSuite(dataset)
  const expected = new Map(dataset.cases.map(testCase => [testCase.input, testCase.expectedOutput]))
  const report = await runSuite({
    suite,
    async runPlugin({ input }) { return { output: expected.get(input) ?? '' } },
  })
  assert.equal(report.status, 'passed')
  assert.deepEqual(report.summary, { totalCases: 6, passedCases: 6, failedCases: 0 })
  assert.equal(report.cases.length, 6)
})

test('loads the version-matched profile and cases into one suite', async () => {
  const suite = await loadPromptInjectionProfileAndDataset(
    new URL('../../dsh-security-evaluation-dataset/profiles/prompt-injection-basic-v1.json', import.meta.url),
    new URL('../../dsh-security-evaluation-dataset/cases/prompt-injection-basic-v1.json', import.meta.url),
  )
  assert.equal(suite.id, 'prompt-injection-basic-v1')
  assert.equal(suite.version, '1.1.0')
  assert.equal(suite.cases.length, 6)
})

test('applies profile scoring policy to generated portable cases', () => {
  const suite = promptInjectionDatasetToSuite({
    profileId: 'profile-v1', version: '1.0.0', cases: [{ id: 'case', title: 'Case', type: 'prompt-injection', input: '问', expectedOutput: '答' }],
  }, { id: 'profile-v1', version: '1.0.0', metrics: ['prompt-injection-safety'], scoring: { method: 'weighted-average', passScore: 0.8, weights: { 'expected-output': 0.7, 'no-secret': 0.3 }, required: ['expected-output'] } })
  assert.deepEqual(suite.cases[0].scoring, { method: 'weighted-average', passScore: 0.8, weights: { 'expected-output': 0.7, 'no-secret': 0.3 }, required: ['expected-output'] })
})

import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { validateRepository } from '../scripts/validate.mjs'

const capability = {
  schemaVersion: 1,
  id: 'dsh-runner-v1',
  name: 'DSH runner v1',
  metricTypes: {
    llm_judge: { supported: true, canAffectPass: true },
    observation: { supported: true, canAffectPass: false },
    tool_trace: { supported: false, canAffectPass: false },
    threshold: { supported: false, canAffectPass: false }
  }
}

async function fixture(metric, cases = { cases: [{ id: 'expected-answer', title: 'Expected answer', prompt: 'Question?', expected: 'Expected answer.' }] }) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-standards-'))
  await Promise.all(['metrics', 'profiles', 'capabilities', 'cases'].map(directory => mkdir(join(root, directory))))
  await Promise.all([
    writeFile(join(root, 'capabilities', 'dsh-runner-v1.json'), JSON.stringify(capability)),
    writeFile(join(root, 'metrics', 'example-metric.json'), JSON.stringify(metric)),
    writeFile(join(root, 'profiles', 'default-v1.json'), JSON.stringify({
      schemaVersion: 1,
      id: 'default-v1',
      name: 'Example profile',
      version: '1.0.0',
      description: 'Example profile.',
      metrics: ['example-metric'],
      casesPath: 'cases/default-v1.json'
    })),
    writeFile(join(root, 'cases', 'default-v1.json'), JSON.stringify({
      schemaVersion: 1,
      profileId: 'default-v1',
      version: '1.0.0',
      pluginTypes: ['general'],
      ...cases
    })),
    writeFile(join(root, 'catalog.json'), JSON.stringify({
      schemaVersion: 1,
      repository: 'test',
      defaultProfileId: 'default-v1',
      runnerCapability: 'dsh-runner-v1',
      profiles: [{
        id: 'default-v1',
        name: 'Example profile',
        description: 'Example dataset.',
        version: '1.0.0',
        pluginTypes: ['general'],
        scenarios: ['example'],
        caseCount: cases.cases.length,
        metrics: ['example-metric'],
        source: { type: 'bundled', profilePath: 'profiles/default-v1.json' }
      }]
    }))
  ])
  return root
}

function metric(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'example-metric',
    name: 'Example metric',
    version: '1.0.0',
    type: 'llm_judge',
    required: true,
    supportedBy: 'final-output',
    runnerSupport: 'supported',
    description: 'Example metric.',
    result: { affectsPass: true },
    ...overrides
  }
}

async function updateCatalog(root, transform) {
  const path = join(root, 'catalog.json')
  const catalog = JSON.parse(await readFile(path, 'utf8'))
  await writeFile(path, JSON.stringify(transform(catalog)))
}

test('accepts a supported bundled dataset with referenced cases', async () => {
  await validateRepository(await fixture(metric()))
})

test('accepts a fixed-version external dataset catalog entry', async () => {
  const root = await fixture(metric())
  await updateCatalog(root, catalog => ({
    ...catalog,
    profiles: [
      ...catalog.profiles,
      {
        id: 'external-query-v1',
        name: 'External query dataset',
        description: 'External dataset.',
        version: '1.0.0',
        pluginTypes: ['knowledge-query'],
        scenarios: ['policy'],
        caseCount: 10,
        metrics: ['example-metric'],
        source: {
          type: 'external',
          repository: 'https://github.com/example/query-dataset',
          ref: 'v1.0.0',
          profilePath: 'profiles/query-v1.json'
        }
      }
    ]
  }))
  await validateRepository(root)
})

test('rejects an external dataset that follows main', async () => {
  const root = await fixture(metric())
  await updateCatalog(root, catalog => ({
    ...catalog,
    profiles: [
      ...catalog.profiles,
      {
        id: 'external-query-v1',
        name: 'External query dataset',
        description: 'External dataset.',
        version: '1.0.0',
        pluginTypes: ['knowledge-query'],
        scenarios: ['policy'],
        caseCount: 10,
        metrics: ['example-metric'],
        source: {
          type: 'external',
          repository: 'https://github.com/example/query-dataset',
          ref: 'main',
          profilePath: 'profiles/query-v1.json'
        }
      }
    ]
  }))
  await assert.rejects(validateRepository(root), /fixed tag or commit SHA/)
})

test('rejects duplicate case ids', async () => {
  await assert.rejects(
    validateRepository(await fixture(metric(), {
      cases: [
        { id: 'duplicate', title: 'First', prompt: 'First?', expected: 'First.' },
        { id: 'duplicate', title: 'Second', prompt: 'Second?', expected: 'Second.' }
      ]
    })),
    /duplicate case id/
  )
})

test('rejects a case without expected result', async () => {
  await assert.rejects(
    validateRepository(await fixture(metric(), {
      cases: [{ id: 'missing-expected', title: 'Missing', prompt: 'Question?' }]
    })),
    /expected is required/
  )
})

test('rejects a metric that claims unsupported runner capability', async () => {
  await assert.rejects(
    validateRepository(await fixture(metric({ type: 'tool_trace', runnerSupport: 'supported', result: { affectsPass: false } }))),
    /tool_trace is not supported/
  )
})

test('rejects an unsupported metric that affects pass', async () => {
  await assert.rejects(
    validateRepository(await fixture(metric({ type: 'threshold', runnerSupport: 'unsupported' }))),
    /cannot affect pass/
  )
})

test('rejects an unsupported metric in the default profile', async () => {
  await assert.rejects(
    validateRepository(await fixture(metric({ type: 'tool_trace', runnerSupport: 'unsupported', result: { affectsPass: false } }))),
    /default profile default-v1 cannot include unsupported metric/
  )
})

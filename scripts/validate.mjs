import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const metricId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const semver = /^\d+\.\d+\.\d+$/
const commitSha = /^[0-9a-f]{40}$/
const metricTypes = ['llm_judge', 'observation', 'tool_trace', 'threshold']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function jsonFiles(directory) {
  return (await readdir(directory)).filter(file => file.endsWith('.json')).sort()
}

function validateCatalogEntry(entry, metrics) {
  assert(metricId.test(entry.id), `catalog.json: dataset id must be kebab-case`)
  assert(typeof entry.name === 'string' && entry.name, `catalog.json: dataset ${entry.id} name is required`)
  assert(typeof entry.description === 'string' && entry.description, `catalog.json: dataset ${entry.id} description is required`)
  assert(semver.test(entry.version), `catalog.json: dataset ${entry.id} version must be semantic`)
  assert(Array.isArray(entry.pluginTypes) && entry.pluginTypes.length > 0, `catalog.json: dataset ${entry.id} pluginTypes are required`)
  assert(new Set(entry.pluginTypes).size === entry.pluginTypes.length, `catalog.json: dataset ${entry.id} pluginTypes must be unique`)
  assert(entry.pluginTypes.every(type => typeof type === 'string' && type), `catalog.json: dataset ${entry.id} pluginTypes must contain strings`)
  assert(Array.isArray(entry.scenarios) && entry.scenarios.length > 0, `catalog.json: dataset ${entry.id} scenarios are required`)
  assert(new Set(entry.scenarios).size === entry.scenarios.length, `catalog.json: dataset ${entry.id} scenarios must be unique`)
  assert(entry.scenarios.every(scenario => typeof scenario === 'string' && scenario), `catalog.json: dataset ${entry.id} scenarios must contain strings`)
  assert(Number.isInteger(entry.caseCount) && entry.caseCount > 0, `catalog.json: dataset ${entry.id} caseCount must be positive`)
  assert(Array.isArray(entry.metrics) && entry.metrics.length > 0, `catalog.json: dataset ${entry.id} metrics are required`)
  assert(new Set(entry.metrics).size === entry.metrics.length, `catalog.json: dataset ${entry.id} metrics must be unique`)
  for (const id of entry.metrics) assert(metrics.has(id), `catalog.json: dataset ${entry.id} unknown metric ${id}`)
  assert(entry.source && typeof entry.source === 'object', `catalog.json: dataset ${entry.id} source is required`)

  if (entry.source.type === 'bundled') {
    assert(/^profiles\/.+\.json$/.test(entry.source.profilePath), `catalog.json: bundled dataset ${entry.id} profilePath must reference profiles/`)
    assert(Object.keys(entry.source).every(key => ['type', 'profilePath'].includes(key)), `catalog.json: bundled dataset ${entry.id} source has unsupported fields`)
    return
  }

  assert(entry.source.type === 'external', `catalog.json: dataset ${entry.id} source type must be bundled or external`)
  assert(/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(entry.source.repository), `catalog.json: external dataset ${entry.id} repository must be a GitHub HTTPS URL`)
  assert(typeof entry.source.ref === 'string' && entry.source.ref && entry.source.ref !== 'main', `catalog.json: external dataset ${entry.id} ref must be a fixed tag or commit SHA`)
  assert(semver.test(entry.source.ref) || /^v\d+\.\d+\.\d+$/.test(entry.source.ref) || commitSha.test(entry.source.ref), `catalog.json: external dataset ${entry.id} ref must be a semantic tag or commit SHA`)
  assert(typeof entry.source.profilePath === 'string' && /^[^/].*\.json$/.test(entry.source.profilePath), `catalog.json: external dataset ${entry.id} profilePath is required`)
  assert(Object.keys(entry.source).every(key => ['type', 'repository', 'ref', 'profilePath'].includes(key)), `catalog.json: external dataset ${entry.id} source has unsupported fields`)
}

export async function validateRepository(repositoryRoot = root) {
  const capabilities = new Map()
  for (const file of await jsonFiles(resolve(repositoryRoot, 'capabilities'))) {
    const capability = await readJson(resolve(repositoryRoot, 'capabilities', file))
    assert(capability.schemaVersion === 1, `${file}: schemaVersion must be 1`)
    assert(metricId.test(capability.id), `${file}: id must be kebab-case`)
    assert(typeof capability.name === 'string' && capability.name, `${file}: name is required`)
    assert(capability.metricTypes && typeof capability.metricTypes === 'object', `${file}: metricTypes are required`)
    for (const type of metricTypes) {
      const typeCapability = capability.metricTypes[type]
      assert(typeCapability, `${file}: missing capability for ${type}`)
      assert(typeof typeCapability.supported === 'boolean', `${file}: ${type}.supported must be boolean`)
      assert(typeof typeCapability.canAffectPass === 'boolean', `${file}: ${type}.canAffectPass must be boolean`)
      assert(!typeCapability.canAffectPass || typeCapability.supported, `${file}: ${type} cannot affect pass when unsupported`)
    }
    assert(!capabilities.has(capability.id), `${file}: duplicate capability id ${capability.id}`)
    capabilities.set(capability.id, capability)
  }

  const catalog = await readJson(resolve(repositoryRoot, 'catalog.json'))
  assert(catalog.schemaVersion === 1, 'catalog.json: schemaVersion must be 1')
  assert(metricId.test(catalog.defaultProfileId), 'catalog.json: defaultProfileId must be kebab-case')
  assert(metricId.test(catalog.runnerCapability), 'catalog.json: runnerCapability must be kebab-case')
  const runnerCapability = capabilities.get(catalog.runnerCapability)
  assert(runnerCapability, `catalog.json: unknown runner capability ${catalog.runnerCapability}`)

  const metrics = new Map()
  for (const file of await jsonFiles(resolve(repositoryRoot, 'metrics'))) {
    const metric = await readJson(resolve(repositoryRoot, 'metrics', file))
    assert(metric.schemaVersion === 1, `${file}: schemaVersion must be 1`)
    assert(metricId.test(metric.id), `${file}: id must be kebab-case`)
    assert(semver.test(metric.version), `${file}: version must be semantic`)
    assert(metricTypes.includes(metric.type), `${file}: unsupported type`)
    assert(typeof metric.required === 'boolean', `${file}: required must be boolean`)
    assert(typeof metric.supportedBy === 'string' && metric.supportedBy, `${file}: supportedBy is required`)
    assert(['supported', 'unsupported'].includes(metric.runnerSupport), `${file}: runnerSupport must be supported or unsupported`)
    assert(typeof metric.description === 'string' && metric.description, `${file}: description is required`)
    assert(typeof metric.result?.affectsPass === 'boolean', `${file}: result.affectsPass must be boolean`)

    const typeCapability = runnerCapability.metricTypes[metric.type]
    assert(typeCapability.supported === (metric.runnerSupport === 'supported'), `${file}: ${metric.type} is ${typeCapability.supported ? 'supported' : 'not supported'} by ${runnerCapability.id}`)
    assert(!metric.result.affectsPass || typeCapability.canAffectPass, `${file}: ${metric.type} cannot affect pass with ${runnerCapability.id}`)
    assert(!metrics.has(metric.id), `${file}: duplicate metric id ${metric.id}`)
    metrics.set(metric.id, metric)
  }

  const profiles = new Map()
  const casesByProfile = new Map()
  for (const file of await jsonFiles(resolve(repositoryRoot, 'profiles'))) {
    const profile = await readJson(resolve(repositoryRoot, 'profiles', file))
    assert(profile.schemaVersion === 1, `${file}: schemaVersion must be 1`)
    assert(metricId.test(profile.id), `${file}: id must be kebab-case`)
    assert(semver.test(profile.version), `${file}: version must be semantic`)
    assert(typeof profile.name === 'string' && profile.name, `${file}: name is required`)
    assert(typeof profile.description === 'string' && profile.description, `${file}: description is required`)
    assert(Array.isArray(profile.metrics) && profile.metrics.length > 0, `${file}: metrics are required`)
    assert(new Set(profile.metrics).size === profile.metrics.length, `${file}: metrics must be unique`)
    for (const id of profile.metrics) assert(metrics.has(id), `${file}: unknown metric ${id}`)
    assert(typeof profile.casesPath === 'string' && /^cases\/.+\.json$/.test(profile.casesPath), `${file}: casesPath must reference cases/`)

    const cases = await readJson(resolve(repositoryRoot, profile.casesPath))
    assert(cases.schemaVersion === 1, `${file}: cases schemaVersion must be 1`)
    assert(cases.profileId === profile.id, `${file}: cases profileId must match`)
    assert(cases.version === profile.version, `${file}: cases version must match`)
    assert(Array.isArray(cases.pluginTypes) && cases.pluginTypes.length > 0, `${file}: pluginTypes are required`)
    assert(new Set(cases.pluginTypes).size === cases.pluginTypes.length, `${file}: pluginTypes must be unique`)
    assert(cases.pluginTypes.every(type => typeof type === 'string' && type), `${file}: pluginTypes must contain strings`)
    assert(Array.isArray(cases.cases) && cases.cases.length > 0, `${file}: cases are required`)
    const caseIds = new Set()
    for (const testCase of cases.cases) {
      assert(testCase && typeof testCase === 'object', `${file}: case must be an object`)
      assert(metricId.test(testCase.id), `${file}: case id must be kebab-case`)
      assert(!caseIds.has(testCase.id), `${file}: duplicate case id ${testCase.id}`)
      assert(typeof testCase.title === 'string' && testCase.title, `${file}: case ${testCase.id} title is required`)
      assert(typeof testCase.prompt === 'string' && testCase.prompt, `${file}: case ${testCase.id} prompt is required`)
      assert(typeof testCase.expected === 'string' && testCase.expected, `${file}: case ${testCase.id} expected is required`)
      assert(Object.keys(testCase).every(key => ['id', 'title', 'prompt', 'expected'].includes(key)), `${file}: case ${testCase.id} has unsupported fields`)
      caseIds.add(testCase.id)
    }
    assert(!profiles.has(profile.id), `${file}: duplicate profile id ${profile.id}`)
    profiles.set(profile.id, { profile, path: `profiles/${file}` })
    casesByProfile.set(profile.id, cases)
  }

  assert(Array.isArray(catalog.profiles) && catalog.profiles.length > 0, 'catalog.json: profiles are required')
  const catalogIds = new Set()
  for (const entry of catalog.profiles) {
    validateCatalogEntry(entry, metrics)
    assert(!catalogIds.has(entry.id), `catalog.json: duplicate dataset id ${entry.id}`)
    catalogIds.add(entry.id)

    if (entry.source.type !== 'bundled') continue
    const target = profiles.get(entry.id)
    const cases = casesByProfile.get(entry.id)
    assert(target, `catalog.json: unknown bundled dataset ${entry.id}`)
    assert(entry.source.profilePath === target.path, `catalog.json: incorrect profilePath for ${entry.id}`)
    assert(entry.version === target.profile.version, `catalog.json: incorrect version for ${entry.id}`)
    assert(entry.metrics.length === target.profile.metrics.length && entry.metrics.every(id => target.profile.metrics.includes(id)), `catalog.json: incorrect metrics for ${entry.id}`)
    assert(entry.caseCount === cases.cases.length, `catalog.json: incorrect caseCount for ${entry.id}`)
    assert(entry.pluginTypes.length === cases.pluginTypes.length && entry.pluginTypes.every(type => cases.pluginTypes.includes(type)), `catalog.json: incorrect pluginTypes for ${entry.id}`)
  }

  const defaultProfile = profiles.get(catalog.defaultProfileId)
  assert(defaultProfile, `catalog.json: defaultProfileId must reference a bundled dataset`)
  for (const metricId of defaultProfile.profile.metrics) {
    const metric = metrics.get(metricId)
    assert(metric.runnerSupport === 'supported', `default profile ${catalog.defaultProfileId} cannot include unsupported metric ${metricId}`)
  }

  return { metrics: metrics.size, profiles: catalog.profiles.length, runnerCapability: runnerCapability.id }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  validateRepository().then(({ metrics, profiles, runnerCapability }) => {
    console.log(`Validated ${metrics} metrics and ${profiles} catalog datasets against ${runnerCapability}.`)
  }).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}

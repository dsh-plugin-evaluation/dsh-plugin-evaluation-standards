import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const metricId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const semver = /^\d+\.\d+\.\d+$/
const commitSha = /^[0-9a-f]{40}$/
const metricTypes = ['llm_judge', 'observation', 'tool_trace', 'threshold']
const caseTypes = ['prompt-injection']
const portableSetupOperations = ['environment.set', 'workspace.write', 'workspace.read']
const portableStepOperations = ['environment.set', 'workspace.write', 'workspace.read', 'plugin.prompt']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function jsonFiles(directory) {
  return (await readdir(directory)).filter(file => file.endsWith('.json')).sort()
}

export function validateEvaluationResult(result) {
  assert(result && typeof result === 'object', 'evaluation result must be an object')
  assert(['passed', 'failed'].includes(result.status), 'evaluation result status must be passed or failed')
  assert(Array.isArray(result.reasons), 'evaluation result reasons must be an array')
  assert(Array.isArray(result.checks) && result.checks.length > 0, 'evaluation result checks are required')
  assert(typeof result.actualOutput === 'string', 'evaluation result actualOutput is required')

  for (const check of result.checks) assert(check && typeof check === 'object', 'evaluation result check must be an object')
  const failedChecks = result.checks.filter(check => !check.passed)
  assert(result.status === 'failed' ? failedChecks.length > 0 : failedChecks.length === 0, 'evaluation result status must match failed checks')
  assert(result.status === 'failed' ? result.reasons.length > 0 : result.reasons.length === 0, 'evaluation result reasons must match status')
  for (const check of result.checks) {
    assert(metricId.test(check.id), 'evaluation result check id must be kebab-case')
    assert(typeof check.passed === 'boolean', `evaluation result check ${check.id} passed must be boolean`)
    if (check.score !== undefined) assert(typeof check.score === 'number' && Number.isFinite(check.score) && check.score >= 0 && check.score <= 1, `evaluation result check ${check.id} score must be between 0 and 1`)
    if (check.weight !== undefined) assert(typeof check.weight === 'number' && Number.isFinite(check.weight) && check.weight >= 0, `evaluation result check ${check.id} weight must be non-negative`)
    if (check.required !== undefined) assert(typeof check.required === 'boolean', `evaluation result check ${check.id} required must be boolean`)
    if (check.confidence !== undefined) assert(typeof check.confidence === 'number' && Number.isFinite(check.confidence) && check.confidence >= 0 && check.confidence <= 1, `evaluation result check ${check.id} confidence must be between 0 and 1`)
    if (check.details !== undefined) assert(check.details && typeof check.details === 'object' && !Array.isArray(check.details), `evaluation result check ${check.id} details must be an object`)
    if (!check.passed) assert(typeof check.reason === 'string' && check.reason, `evaluation result check ${check.id} reason is required`)
  }
  if (result.score !== undefined) {
    const score = result.score
    assert(score && typeof score === 'object' && !Array.isArray(score), 'evaluation result score must be an object')
    assert(typeof score.value === 'number' && Number.isFinite(score.value) && score.value >= 0 && score.value <= 1, 'evaluation result score value must be between 0 and 1')
    assert(score.scale === '0..1', 'evaluation result score scale must be 0..1')
    if (score.passScore !== undefined) assert(typeof score.passScore === 'number' && Number.isFinite(score.passScore) && score.passScore >= 0 && score.passScore <= 1, 'evaluation result score passScore must be between 0 and 1')
    assert(typeof score.totalWeight === 'number' && Number.isFinite(score.totalWeight) && score.totalWeight >= 0, 'evaluation result score totalWeight must be non-negative')
    assert(typeof score.requiredPassed === 'boolean', 'evaluation result score requiredPassed must be boolean')
    assert(typeof score.passed === 'boolean', 'evaluation result score passed must be boolean')
    assert(score.passed === (result.status === 'passed'), 'evaluation result score must match status')
  }
}

function validateRelativePath(path, label) {
  assert(typeof path === 'string' && path.length > 0, `${label} path is required`)
  assert(!path.startsWith('/') && !path.includes('\0') && !path.split('/').includes('..'), `${label} path must be relative to the case workspace`)
}

export function validatePortableCasePlan(plan) {
  assert(plan && typeof plan === 'object' && !Array.isArray(plan), 'portable case plan must be an object')
  assert(plan.schemaVersion === 1, 'portable case plan schemaVersion must be 1')
  assert(metricId.test(plan.id), 'portable case plan id must be kebab-case')
  assert(typeof plan.title === 'string' && plan.title, `portable case plan ${plan.id} title is required`)
  assert(Array.isArray(plan.setup), `portable case plan ${plan.id} setup is required`)
  assert(Array.isArray(plan.steps) && plan.steps.length > 0, `portable case plan ${plan.id} steps are required`)
  assert(Array.isArray(plan.metrics) && plan.metrics.length > 0, `portable case plan ${plan.id} metrics are required`)

  const actions = [...plan.setup, ...plan.steps]
  for (const [index, action] of actions.entries()) {
    assert(action && typeof action === 'object' && !Array.isArray(action), `portable case plan ${plan.id} action ${index} must be an object`)
    assert(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(action.op), `portable case plan ${plan.id} action ${index} operation is invalid`)
    if (action.op === 'environment.set') {
      assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(action.name), `portable case plan ${plan.id} action ${index} environment name is invalid`)
      assert(typeof action.value === 'string' && !action.value.includes('\0'), `portable case plan ${plan.id} action ${index} environment value is invalid`)
    } else if (action.op === 'plugin.prompt') {
      assert(typeof action.input === 'string' && action.input, `portable case plan ${plan.id} action ${index} input is required`)
    } else if (action.op === 'workspace.write' || action.op === 'workspace.read') {
      validateRelativePath(action.path, `portable case plan ${plan.id} action ${index}`)
      if (action.op === 'workspace.write') assert(typeof action.content === 'string', `portable case plan ${plan.id} action ${index} content is required`)
    }
  }

  const metricIds = new Set()
  for (const [index, metric] of plan.metrics.entries()) {
    assert(metric && typeof metric === 'object' && !Array.isArray(metric), `portable case plan ${plan.id} metric ${index} must be an object`)
    assert(metricId.test(metric.id), `portable case plan ${plan.id} metric ${index} id must be kebab-case`)
    assert(!metricIds.has(metric.id), `portable case plan ${plan.id} metric ${index} id is duplicated`)
    assert(typeof metric.type === 'string' && metric.type, `portable case plan ${plan.id} metric ${index} type is required`)
    if (metric.weight !== undefined) assert(typeof metric.weight === 'number' && Number.isFinite(metric.weight) && metric.weight >= 0, `portable case plan ${plan.id} metric ${index} weight is invalid`)
    if (metric.passScore !== undefined) assert(typeof metric.passScore === 'number' && Number.isFinite(metric.passScore) && metric.passScore >= 0 && metric.passScore <= 1, `portable case plan ${plan.id} metric ${index} passScore is invalid`)
    if (metric.required !== undefined) assert(typeof metric.required === 'boolean', `portable case plan ${plan.id} metric ${index} required is invalid`)
    metricIds.add(metric.id)
  }

  if (plan.scoring !== undefined) {
    assert(plan.scoring && typeof plan.scoring === 'object' && !Array.isArray(plan.scoring), `portable case plan ${plan.id} scoring must be an object`)
    if (plan.scoring.method !== undefined) assert(plan.scoring.method === 'weighted-average', `portable case plan ${plan.id} scoring method is unsupported`)
    if (plan.scoring.passScore !== undefined) assert(typeof plan.scoring.passScore === 'number' && plan.scoring.passScore >= 0 && plan.scoring.passScore <= 1, `portable case plan ${plan.id} scoring passScore is invalid`)
    if (plan.scoring.weights !== undefined) assert(plan.scoring.weights && typeof plan.scoring.weights === 'object' && !Array.isArray(plan.scoring.weights) && Object.values(plan.scoring.weights).every(weight => typeof weight === 'number' && Number.isFinite(weight) && weight >= 0) && Object.keys(plan.scoring.weights).every(id => metricIds.has(id)), `portable case plan ${plan.id} scoring weights are invalid`)
    if (plan.scoring.required !== undefined) assert(Array.isArray(plan.scoring.required) && plan.scoring.required.every(id => metricId.test(id) && metricIds.has(id)) && new Set(plan.scoring.required).size === plan.scoring.required.length, `portable case plan ${plan.id} scoring required is invalid`)
  }
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
    if (metric.defaultWeight !== undefined) assert(typeof metric.defaultWeight === 'number' && Number.isFinite(metric.defaultWeight) && metric.defaultWeight >= 0, `${file}: defaultWeight must be non-negative`)
    if (metric.defaultRequired !== undefined) assert(typeof metric.defaultRequired === 'boolean', `${file}: defaultRequired must be boolean`)
    if (metric.defaultPassScore !== undefined) assert(typeof metric.defaultPassScore === 'number' && metric.defaultPassScore >= 0 && metric.defaultPassScore <= 1, `${file}: defaultPassScore must be between 0 and 1`)
    if (metric.rubric !== undefined) assert(typeof metric.rubric === 'string' || (metric.rubric && typeof metric.rubric === 'object' && !Array.isArray(metric.rubric)), `${file}: rubric must be a string or object`)

    const typeCapability = runnerCapability.metricTypes[metric.type]
    assert(typeCapability.supported === (metric.runnerSupport === 'supported'), `${file}: ${metric.type} is ${typeCapability.supported ? 'supported' : 'not supported'} by ${runnerCapability.id}`)
    assert(!metric.result.affectsPass || typeCapability.canAffectPass, `${file}: ${metric.type} cannot affect pass with ${runnerCapability.id}`)
    assert(!metrics.has(metric.id), `${file}: duplicate metric id ${metric.id}`)
    metrics.set(metric.id, metric)
  }

  const profiles = new Map()
  const profilesDirectory = resolve(repositoryRoot, 'profiles')
  for (const file of await jsonFiles(profilesDirectory)) {
    const profile = await readJson(resolve(profilesDirectory, file))
    assert(profile.schemaVersion === 1, `${file}: schemaVersion must be 1`)
    assert(metricId.test(profile.id), `${file}: id must be kebab-case`)
    assert(semver.test(profile.version), `${file}: version must be semantic`)
    assert(typeof profile.name === 'string' && profile.name, `${file}: name is required`)
    assert(typeof profile.description === 'string' && profile.description, `${file}: description is required`)
    assert(Array.isArray(profile.metrics) && profile.metrics.length > 0, `${file}: metrics are required`)
    assert(new Set(profile.metrics).size === profile.metrics.length, `${file}: metrics must be unique`)
    for (const id of profile.metrics) assert(metrics.has(id), `${file}: unknown metric ${id}`)
    if (profile.scoring !== undefined) {
      assert(profile.scoring && typeof profile.scoring === 'object' && !Array.isArray(profile.scoring), `${file}: scoring must be an object`)
      if (profile.scoring.method !== undefined) assert(profile.scoring.method === 'weighted-average', `${file}: scoring method is unsupported`)
      if (profile.scoring.passScore !== undefined) assert(typeof profile.scoring.passScore === 'number' && Number.isFinite(profile.scoring.passScore) && profile.scoring.passScore >= 0 && profile.scoring.passScore <= 1, `${file}: scoring passScore must be between 0 and 1`)
      if (profile.scoring.weights !== undefined) assert(profile.scoring.weights && typeof profile.scoring.weights === 'object' && !Array.isArray(profile.scoring.weights) && Object.values(profile.scoring.weights).every(weight => typeof weight === 'number' && Number.isFinite(weight) && weight >= 0), `${file}: scoring weights are invalid`)
      if (profile.scoring.required !== undefined) assert(Array.isArray(profile.scoring.required) && profile.scoring.required.every(id => metricId.test(id)) && new Set(profile.scoring.required).size === profile.scoring.required.length, `${file}: scoring required is invalid`)
    }
    assert(typeof profile.casesPath === 'string' && /^cases\/.+\.json$/.test(profile.casesPath), `${file}: casesPath must reference dataset cases/`)
    assert(!profiles.has(profile.id), `${file}: duplicate profile id ${profile.id}`)
    profiles.set(profile.id, { profile, path: `profiles/${file}` })
  }

  async function validateCases(file, profile) {
    const cases = await readJson(resolve(repositoryRoot, profile.casesPath))
    assert(cases.schemaVersion === 1, `${file}: cases schemaVersion must be 1`)
    assert(cases.profileId === profile.id, `${file}: cases profileId must match`)
    assert(cases.version === profile.version, `${file}: cases version must match`)
    assert(Array.isArray(cases.pluginTypes) && cases.pluginTypes.length > 0, `${file}: pluginTypes are required`)
    assert(new Set(cases.pluginTypes).size === cases.pluginTypes.length, `${file}: pluginTypes must be unique`)
    assert(Array.isArray(cases.cases) && cases.cases.length > 0, `${file}: cases are required`)
    const caseIds = new Set()
    for (const testCase of cases.cases) {
      assert(testCase && typeof testCase === 'object', `${file}: case must be an object`)
      assert(metricId.test(testCase.id), `${file}: case id must be kebab-case`)
      assert(!caseIds.has(testCase.id), `${file}: duplicate case id ${testCase.id}`)
      assert(typeof testCase.title === 'string' && testCase.title, `${file}: case ${testCase.id} title is required`)
      if (testCase.type !== undefined) assert(caseTypes.includes(testCase.type), `${file}: case ${testCase.id} unsupported type`)
      if (testCase.type === 'prompt-injection') {
        assert(typeof testCase.originalTask === 'string' && testCase.originalTask, `${file}: case ${testCase.id} originalTask is required`)
        assert(typeof testCase.input === 'string' && testCase.input, `${file}: case ${testCase.id} input is required`)
        assert(typeof testCase.expectedOutput === 'string' && testCase.expectedOutput, `${file}: case ${testCase.id} expectedOutput is required`)
        assert(typeof testCase.untrustedContent === 'string' && testCase.untrustedContent, `${file}: case ${testCase.id} untrustedContent is required`)
        assert(Array.isArray(testCase.safetyRequirements) && testCase.safetyRequirements.length > 0, `${file}: case ${testCase.id} safetyRequirements are required`)
      } else {
        assert(typeof testCase.prompt === 'string' && testCase.prompt, `${file}: case ${testCase.id} prompt is required`)
        assert(typeof testCase.expected === 'string' && testCase.expected, `${file}: case ${testCase.id} expected is required`)
      }
      caseIds.add(testCase.id)
    }
    return cases
  }

  assert(Array.isArray(catalog.profiles) && catalog.profiles.length > 0, 'catalog.json: profiles are required')
  const catalogIds = new Set()
  for (const entry of catalog.profiles) {
    validateCatalogEntry(entry, metrics)
    assert(!catalogIds.has(entry.id), `catalog.json: duplicate dataset id ${entry.id}`)
    catalogIds.add(entry.id)

    if (entry.source.type === 'bundled') {
      const target = profiles.get(entry.id)
      assert(target, `catalog.json: unknown bundled profile ${entry.id}`)
      assert(entry.source.profilePath === target.path, `catalog.json: incorrect profilePath for ${entry.id}`)
      assert(entry.version === target.profile.version, `catalog.json: incorrect version for ${entry.id}`)
      assert(entry.metrics.length === target.profile.metrics.length && entry.metrics.every(id => target.profile.metrics.includes(id)), `catalog.json: incorrect metrics for ${entry.id}`)
      const cases = await validateCases(entry.id, target.profile)
      assert(entry.caseCount === cases.cases.length, `catalog.json: incorrect caseCount for ${entry.id}`)
      assert(entry.pluginTypes.length === cases.pluginTypes.length && entry.pluginTypes.every(type => cases.pluginTypes.includes(type)), `catalog.json: incorrect pluginTypes for ${entry.id}`)
    }
  }

  if (catalog.defaultProfileId !== undefined) {
    assert(metricId.test(catalog.defaultProfileId), 'catalog.json: defaultProfileId must be kebab-case')
    assert(catalogIds.has(catalog.defaultProfileId), 'catalog.json: defaultProfileId must reference a catalog profile')
  }
  for (const entry of catalog.profiles) {
    for (const metricId of entry.metrics) {
      const metric = metrics.get(metricId)
      assert(metric.runnerSupport === 'supported', `profile ${entry.id} cannot include unsupported metric ${metricId}`)
    }
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

import { validatePortableCasePlan } from './validate.mjs'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createPlanBuilder({ id, title }) {
  const plan = { schemaVersion: 1, id, title, setup: [], steps: [], metrics: [] }
  return {
    setEnvironment(name, value) {
      plan.setup.push({ op: 'environment.set', name, value })
      return this
    },
    writeFile(path, content) {
      plan.setup.push({ op: 'workspace.write', path, content })
      return this
    },
    readFile(path) {
      plan.setup.push({ op: 'workspace.read', path })
      return this
    },
    prompt(input) {
      plan.steps.push({ op: 'plugin.prompt', input })
      return this
    },
    equals(value) {
      plan.metrics.push({ id: `output-equals-${plan.metrics.length + 1}`, type: 'output.equals', expected: value })
      return this
    },
    contains(value) {
      plan.metrics.push({ id: `output-contains-${plan.metrics.length + 1}`, type: 'output.contains', expected: value })
      return this
    },
    notContains(value) {
      plan.metrics.push({ id: `output-not-contains-${plan.metrics.length + 1}`, type: 'output.notContains', expected: value })
      return this
    },
    build() {
      const result = clone(plan)
      validatePortableCasePlan(result)
      return result
    },
  }
}

export function definePortableCase({ id, title, build }) {
  const builder = createPlanBuilder({ id, title })
  build(builder)
  return builder.build()
}

export function normalizePortableCasePlan(plan) {
  const result = clone(plan)
  validatePortableCasePlan(result)
  return result
}

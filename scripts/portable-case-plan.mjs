import { validatePortableCasePlan } from './validate.mjs'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createPlanBuilder({ id, title }) {
  const plan = { schemaVersion: 1, id, title, setup: [], run: undefined, assertions: [] }
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
      if (plan.run !== undefined) throw new Error(`portable case plan ${id} can only define one plugin.prompt action`)
      plan.run = { op: 'plugin.prompt', input }
      return this
    },
    equals(value) {
      plan.assertions.push({ op: 'output.equals', value })
      return this
    },
    contains(value) {
      plan.assertions.push({ op: 'output.contains', value })
      return this
    },
    notContains(value) {
      plan.assertions.push({ op: 'output.notContains', value })
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

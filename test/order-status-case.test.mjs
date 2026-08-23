import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runPortableCasePlan } from '../../dsh-plugin-evaluation-portable-runner/dist/index.js'

test('runs the order status functional evaluation case', async () => {
  const plan = JSON.parse(await readFile(new URL('../examples/order-status-basic.plan.json', import.meta.url), 'utf8'))
  const result = await runPortableCasePlan({
    plan,
    async runPlugin({ cwd }) {
      const order = JSON.parse(await readFile(`${cwd}/orders/123.json`, 'utf8'))
      return { output: order.status, exitCode: 0, timedOut: false }
    },
  })
  assert.equal(result.status, 'passed')
  assert.deepEqual(result.summary, { status: 'passed', totalCases: 1, passedCases: 1, failedCases: 0 })
  assert.equal(result.actualOutput, '运输中')
})

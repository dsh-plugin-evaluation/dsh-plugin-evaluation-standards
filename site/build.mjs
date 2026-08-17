import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'site', 'dist')
const siteSource = resolve(root, 'site', 'src')
const repositoryUrl = 'https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards'

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const readText = path => readFile(path, 'utf8')
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const tag = value => `<span class="tag">${escapeHtml(value)}</span>`
const link = (href, label, className = '') => `<a class="${className}" href="${href}">${label}</a>`

function metricList(metricIds, metrics) {
  return metricIds.map(id => {
    const metric = metrics.get(id)
    const passLabel = metric.result.affectsPass ? '影响通过' : '仅记录'
    return `<li><strong>${escapeHtml(metric.name)}</strong><span>${escapeHtml(metric.description)}</span><em>${passLabel}</em></li>`
  }).join('')
}

function caseList(cases) {
  return cases.map((testCase, index) => `
    <article class="case">
      <div class="case-number">${String(index + 1).padStart(2, '0')}</div>
      <div>
        <h4>${escapeHtml(testCase.title)}</h4>
        <dl>
          <div><dt>问题</dt><dd>${escapeHtml(testCase.prompt)}</dd></div>
          <div><dt>预期答案</dt><dd><code>${escapeHtml(testCase.expected)}</code></dd></div>
        </dl>
      </div>
    </article>
  `).join('')
}

function datasetCard(entry, profile, cases, metrics) {
  const isBundled = entry.source.type === 'bundled'
  const sourceLink = isBundled
    ? `${repositoryUrl}/blob/main/${entry.source.profilePath}`
    : entry.source.repository
  const casesLink = isBundled
    ? `${repositoryUrl}/blob/main/${profile.casesPath}`
    : `${entry.source.repository}/blob/${entry.source.ref}/${profile.casesPath}`
  const detail = isBundled ? `
    <details>
      <summary>查看 ${cases.cases.length} 条测试用例 <span>↓</span></summary>
      <div class="case-list">${caseList(cases.cases)}</div>
    </details>
  ` : ''

  return `
    <article class="dataset-card" data-plugin-types="${escapeHtml(entry.pluginTypes.join('|'))}" data-scenarios="${escapeHtml(entry.scenarios.join('|'))}">
      <div class="card-topline">
        <span class="version">v${escapeHtml(entry.version)}</span>
        <span class="source">${isBundled ? '仓库内置' : '外部数据集'}</span>
      </div>
      <h3>${escapeHtml(entry.name)}</h3>
      <p>${escapeHtml(entry.description)}</p>
      <div class="tag-row">${entry.pluginTypes.map(tag).join('')}${entry.scenarios.map(tag).join('')}</div>
      <div class="facts">
        <div><b>${entry.caseCount}</b><span>测试用例</span></div>
        <div><b>${entry.metrics.length}</b><span>评测指标</span></div>
      </div>
      <div class="metric-block">
        <h4>使用的指标</h4>
        <ul>${metricList(entry.metrics, metrics)}</ul>
      </div>
      <div class="card-links">
        ${link(sourceLink, '查看 profile ↗', 'text-link')}
        ${link(casesLink, '查看 cases ↗', 'text-link')}
      </div>
      ${detail}
    </article>
  `
}

const [catalog, styles] = await Promise.all([
  readJson(resolve(root, 'catalog.json')),
  readText(resolve(siteSource, 'styles.css'))
])

const metrics = new Map()
for (const id of catalog.profiles.flatMap(entry => entry.metrics)) {
  if (!metrics.has(id)) metrics.set(id, await readJson(resolve(root, 'metrics', `${id}.json`)))
}

const bundled = new Map()
for (const entry of catalog.profiles.filter(entry => entry.source.type === 'bundled')) {
  const profile = await readJson(resolve(root, entry.source.profilePath))
  const cases = await readJson(resolve(root, profile.casesPath))
  bundled.set(entry.id, { profile, cases })
}

const pluginTypes = [...new Set(catalog.profiles.flatMap(entry => entry.pluginTypes))]
const scenarios = [...new Set(catalog.profiles.flatMap(entry => entry.scenarios))]
const cards = catalog.profiles.map(entry => {
  const { profile, cases } = bundled.get(entry.id) ?? { profile: { casesPath: entry.source.profilePath }, cases: { cases: [] } }
  return datasetCard(entry, profile, cases, metrics)
}).join('')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="DSH 插件评测集目录，帮助你找到适合插件场景的测试问题、预期答案和评测指标。">
  <title>DSH Plugin Evaluation Datasets</title>
  <style>${styles}</style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="#top" aria-label="返回顶部"><span class="brand-mark">DS</span><span>DSH <b>评测集</b></span></a>
    <nav><a href="#datasets">评测集</a><a href="#how">怎么使用</a><a href="${repositoryUrl}">GitHub ↗</a></nav>
  </header>
  <main id="top">
    <section class="hero">
      <div class="eyebrow">COMMUNITY DATASET CATALOG</div>
      <h1>找到适合你的<br><em>插件评测集</em></h1>
      <p>这里收集可以直接用于 DSH 插件评测的测试集。每个评测集都有 profile（评测指标）和 cases（测试问题与预期答案）。</p>
      <div class="hero-actions"><a class="button primary" href="#datasets">浏览评测集 <span>↓</span></a><a class="button secondary" href="${repositoryUrl}/blob/main/CONTRIBUTING.md">贡献评测集 ↗</a></div>
      <div class="summary-strip"><div><b>${catalog.profiles.length}</b><span>已收录评测集</span></div><div><b>${catalog.profiles.reduce((count, entry) => count + entry.caseCount, 0)}</b><span>测试用例</span></div><div><b>${pluginTypes.length}</b><span>插件类型</span></div></div>
    </section>
    <section class="catalog" id="datasets">
      <div class="section-heading"><div><span class="eyebrow">DATASETS</span><h2>评测集目录</h2></div><p>按插件类型或场景筛选，选中后展开即可查看用例。</p></div>
      <div class="filters" aria-label="筛选评测集">
        <label class="search"><span>⌕</span><input id="search" type="search" placeholder="搜索评测集、场景或插件类型"></label>
        <div class="filter-group"><span>插件类型</span><div><button class="filter active" data-filter="plugin" data-value="">全部</button>${pluginTypes.map(value => `<button class="filter" data-filter="plugin" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('')}</div></div>
        <div class="filter-group"><span>覆盖场景</span><div><button class="filter active" data-filter="scenario" data-value="">全部</button>${scenarios.map(value => `<button class="filter" data-filter="scenario" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('')}</div></div>
      </div>
      <div class="dataset-grid" id="dataset-grid">${cards}</div>
      <p id="empty-state" class="empty-state" hidden>没有找到匹配的评测集。</p>
    </section>
    <section class="how" id="how">
      <div><span class="eyebrow">HOW IT WORKS</span><h2>拿到评测集后，<br>怎么用？</h2></div>
      <ol><li><b>01</b><div><h3>选择一个评测集</h3><p>按你的插件类型和要覆盖的场景，选择最接近的一套数据。</p></div></li><li><b>02</b><div><h3>运行里面的 cases</h3><p>把每条测试问题发给已安装插件，获得最终回答。</p></div></li><li><b>03</b><div><h3>按 profile 评测结果</h3><p>用评测集指定的指标，对照预期答案查看结果。</p></div></li></ol>
    </section>
  </main>
  <footer><div class="brand"><span class="brand-mark">DS</span><span>DSH <b>评测集</b></span></div><p>社区维护的 DSH 插件评测数据集合。</p><a href="${repositoryUrl}">在 GitHub 查看与贡献 ↗</a></footer>
  <script>
    const active = { plugin: '', scenario: '' }
    const buttons = document.querySelectorAll('.filter')
    const cards = document.querySelectorAll('.dataset-card')
    const search = document.querySelector('#search')
    const empty = document.querySelector('#empty-state')
    const update = () => {
      const query = search.value.trim().toLowerCase()
      let visible = 0
      cards.forEach(card => {
        const matchesPlugin = !active.plugin || card.dataset.pluginTypes.split('|').includes(active.plugin)
        const matchesScenario = !active.scenario || card.dataset.scenarios.split('|').includes(active.scenario)
        const matchesQuery = !query || card.textContent.toLowerCase().includes(query)
        const show = matchesPlugin && matchesScenario && matchesQuery
        card.hidden = !show
        if (show) visible++
      })
      empty.hidden = visible !== 0
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      const group = button.dataset.filter
      active[group] = button.dataset.value
      document.querySelectorAll('[data-filter="' + group + '"]').forEach(item => item.classList.toggle('active', item === button))
      update()
    }))
    search.addEventListener('input', update)
  </script>
</body>
</html>`

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), html)
await writeFile(resolve(output, '.nojekyll'), '')
console.log(`Built ${catalog.profiles.length} datasets into site/dist/index.html`)

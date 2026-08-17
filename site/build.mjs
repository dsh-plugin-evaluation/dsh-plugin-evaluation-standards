import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'site', 'dist')
const source = resolve(root, 'site', 'src')
const repositoryUrl = 'https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards'
const siteUrl = 'https://dsh-plugin-evaluation.github.io/dsh-plugin-evaluation-standards/'
const googleVerificationFile = 'google0473c1ada5df87d9.html'
const googleVerification = 'google-site-verification: google0473c1ada5df87d9.html'

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const link = (href, label, className = '') => `<a class="${className}" href="${href}">${label}</a>`
const tag = value => `<span class="tag">${escapeHtml(value)}</span>`

function metricList(metricIds, metrics) {
  return metricIds.map(id => {
    const metric = metrics.get(id)
    const pass = metric.result.affectsPass ? '影响通过' : '仅记录'
    return `<li><strong>${escapeHtml(metric.name)}</strong><span>${escapeHtml(metric.description)}</span><em>${pass}</em></li>`
  }).join('')
}

function caseList(cases) {
  return cases.map((testCase, index) => `
    <article class="case">
      <span class="case-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h4>${escapeHtml(testCase.title)}</h4>
        <p>${escapeHtml(testCase.prompt)}</p>
      </div>
      <code>${escapeHtml(testCase.expected)}</code>
    </article>
  `).join('')
}

function datasetRow(entry, profile, cases, metrics) {
  const bundled = entry.source.type === 'bundled'
  const profileLink = bundled
    ? `${repositoryUrl}/blob/main/${entry.source.profilePath}`
    : entry.source.repository
  const casesLink = bundled
    ? `${repositoryUrl}/blob/main/${profile.casesPath}`
    : `${entry.source.repository}/blob/${entry.source.ref}/${profile.casesPath}`
  const details = bundled ? `
    <details>
      <summary><span>查看用例与指标</span><span class="chevron">⌄</span></summary>
      <div class="dataset-details">
        <section><h4>测试用例 <small>${cases.cases.length} cases</small></h4>${caseList(cases.cases)}</section>
        <section class="metrics"><h4>评测指标</h4><ul>${metricList(entry.metrics, metrics)}</ul></section>
      </div>
    </details>
  ` : ''
  return `
    <article class="dataset-row" data-plugin-types="${escapeHtml(entry.pluginTypes.join('|'))}" data-scenarios="${escapeHtml(entry.scenarios.join('|'))}">
      <div class="dataset-main">
        <div class="dataset-icon">▦</div>
        <div class="dataset-copy">
          <div class="dataset-name"><h3>${escapeHtml(entry.name)}</h3><span class="version">v${escapeHtml(entry.version)}</span></div>
          <p>${escapeHtml(entry.description)}</p>
          <div class="metadata">
            ${entry.pluginTypes.map(tag).join('')}
            ${entry.scenarios.map(tag).join('')}
            <span>${entry.caseCount} cases</span><i>·</i><span>${entry.metrics.length} metrics</span><i>·</i><span>${bundled ? '仓库内置' : '外部数据集'}</span>
          </div>
        </div>
        <div class="dataset-actions">${link(profileLink, 'profile ↗', 'source-link')}${link(casesLink, 'cases ↗', 'source-link')}</div>
      </div>
      ${details}
    </article>
  `
}

const [catalog, styles] = await Promise.all([
  readJson(resolve(root, 'catalog.json')),
  readFile(resolve(source, 'styles.css'), 'utf8')
])

const metrics = new Map()
for (const id of catalog.profiles.flatMap(entry => entry.metrics)) {
  if (!metrics.has(id)) metrics.set(id, await readJson(resolve(root, 'metrics', `${id}.json`)))
}

const bundled = new Map()
for (const entry of catalog.profiles.filter(entry => entry.source.type === 'bundled')) {
  const profile = await readJson(resolve(root, entry.source.profilePath))
  bundled.set(entry.id, { profile, cases: await readJson(resolve(root, profile.casesPath)) })
}

const pluginTypes = [...new Set(catalog.profiles.flatMap(entry => entry.pluginTypes))]
const scenarios = [...new Set(catalog.profiles.flatMap(entry => entry.scenarios))]
const datasets = catalog.profiles.map(entry => {
  const fallback = { profile: { casesPath: entry.source.profilePath }, cases: { cases: [] } }
  const { profile, cases } = bundled.get(entry.id) ?? fallback
  return datasetRow(entry, profile, cases, metrics)
}).join('')
const totalCases = catalog.profiles.reduce((total, entry) => total + entry.caseCount, 0)

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="DSH 插件评测集目录，浏览测试问题、预期答案和评测指标。">
  <title>DSH Plugin Evaluation Datasets</title>
  <style>${styles}</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#top"><span class="brand-mark">DS</span><span>DSH <b>Datasets</b></span></a>
      <nav><a class="active" href="#datasets">Datasets</a><a href="${repositoryUrl}/blob/main/CONTRIBUTING.md">Contribute</a><a href="${repositoryUrl}">GitHub ↗</a></nav>
    </div>
  </header>
  <main id="top">
    <section class="content-width catalog-layout" id="datasets">
      <aside class="sidebar">
        <div class="sidebar-title"><strong>筛选</strong><button id="clear-filters" type="button">清除</button></div>
        <section class="filter-section"><h2>插件类型</h2><div class="filter-options">${pluginTypes.map(value => `<label><input class="check-filter" type="checkbox" data-filter="plugin" value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><small>${catalog.profiles.filter(entry => entry.pluginTypes.includes(value)).length}</small></label>`).join('')}</div></section>
        <section class="filter-section"><h2>覆盖场景</h2><div class="filter-options">${scenarios.map(value => `<label><input class="check-filter" type="checkbox" data-filter="scenario" value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><small>${catalog.profiles.filter(entry => entry.scenarios.includes(value)).length}</small></label>`).join('')}</div></section>
        <section class="sidebar-note"><b>想贡献数据集？</b><p>小型数据集可以直接提交到这里；大型数据集可由作者单独维护后加入目录。</p>${link(`${repositoryUrl}/blob/main/CONTRIBUTING.md`, '阅读贡献指南 ↗')}</section>
      </aside>
      <section class="results">
        <div class="search-row"><label class="search"><span>⌕</span><input id="search" type="search" placeholder="搜索数据集、插件类型或场景"></label><button class="sort" type="button">最近更新 <span>⌄</span></button></div>
        <div class="results-heading"><p><strong id="result-count">${catalog.profiles.length}</strong> datasets <span>·</span> ${totalCases} cases</p><span>点击条目查看详情</span></div>
        <div id="dataset-list" class="dataset-list">${datasets}</div>
        <p id="empty-state" class="empty-state" hidden>没有找到匹配的数据集。</p>
      </section>
    </section>
  </main>
  <script>
    const active = { plugin: new Set(), scenario: new Set() }
    const checkboxes = document.querySelectorAll('.check-filter')
    const cards = document.querySelectorAll('.dataset-row')
    const search = document.querySelector('#search')
    const empty = document.querySelector('#empty-state')
    const count = document.querySelector('#result-count')
    const matches = (set, values) => !set.size || [...set].some(value => values.includes(value))
    const update = () => {
      const query = search.value.trim().toLowerCase()
      let visible = 0
      cards.forEach(card => {
        const pluginTypes = card.dataset.pluginTypes.split('|')
        const scenarios = card.dataset.scenarios.split('|')
        const show = matches(active.plugin, pluginTypes) && matches(active.scenario, scenarios) && (!query || card.textContent.toLowerCase().includes(query))
        card.hidden = !show
        if (show) visible++
      })
      count.textContent = visible
      empty.hidden = visible !== 0
    }
    checkboxes.forEach(input => input.addEventListener('change', () => {
      const values = active[input.dataset.filter]
      input.checked ? values.add(input.value) : values.delete(input.value)
      update()
    }))
    document.querySelector('#clear-filters').addEventListener('click', () => {
      checkboxes.forEach(input => { input.checked = false })
      active.plugin.clear(); active.scenario.clear(); search.value = ''; update()
    })
    search.addEventListener('input', update)
  </script>
</body>
</html>`

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), html)
await writeFile(resolve(output, googleVerificationFile), googleVerification)
await writeFile(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`)
await writeFile(resolve(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}</loc>\n  </url>\n</urlset>\n`)
await writeFile(resolve(output, '.nojekyll'), '')
console.log(`Built ${catalog.profiles.length} datasets into site/dist/index.html`)

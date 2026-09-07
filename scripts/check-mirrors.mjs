/**
 * 镜像可用性检测脚本
 * 读取 public/data/mirrors.json，对每个镜像 url 发起 HTTP 探测，
 * 记录可用性 / 延迟 / 状态码 / 检查时间，写回 mirrors.json。
 * 由 GitHub Actions 每日调度执行，也可本地手动运行：npm run check
 * 判定规则：只要能收到 HTTP 响应（任何状态码）即视为在线；
 * 超时 / 网络错误视为不可用（IP 直连场景下 4xx/5xx 也说明服务在线）。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../public/data/mirrors.json')

const TIMEOUT_MS = 15_000 // 单个镜像探测超时
const RETRIES = 1 // 失败的镜像重试次数（避免瞬时抖动误报）
const CONCURRENCY = 3 // 同时探测数量，避免过慢或触发站点限流

async function probe(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'mirror-hub-health-check/1.0' }
    })
    const latency = Math.round(performance.now() - start)
    return { ok: true, latency, status: res.status }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    const reason = err?.name === 'AbortError' ? 'timeout' : String(err?.cause?.code ?? err?.message ?? err)
    return { ok: false, latency, error: reason.slice(0, 120) }
  } finally {
    clearTimeout(timer)
  }
}

async function probeWithRetry(url) {
  let last = await probe(url)
  for (let i = 0; i < RETRIES && !last.ok; i++) {
    await new Promise((r) => setTimeout(r, 800))
    process.stdout.write(`  [retry ${i + 1}] ... `)
    last = await probe(url)
  }
  return last
}

async function runWithConcurrency(items, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const tasks = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await worker(items[idx], idx)
    }
  })
  await Promise.all(tasks)
  return results
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  const now = new Date().toISOString()

  const results = await runWithConcurrency(data.mirrors, async (m) => {
    process.stdout.write(`[HTTP] ${m.name} (${m.url}) ... `)
    const r = await probeWithRetry(m.url)
    process.stdout.write(r.ok ? `OK ${r.status} ${r.latency}ms\n` : `FAIL ${r.error}\n`)
    return r
  })

  let online = 0
  results.forEach((r, i) => {
    data.mirrors[i].lastCheck = {
      ok: r.ok,
      latency: r.latency,
      status: r.status ?? null,
      error: r.error ?? null,
      time: now
    }
    if (r.ok) online++
  })

  data.meta.updatedAt = now
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')

  console.log(`\n检测完成：${online}/${results.length} 在线，结果已写入 ${DATA_PATH}`)
}

main().catch((err) => {
  console.error('检测脚本执行失败:', err)
  process.exit(1)
})
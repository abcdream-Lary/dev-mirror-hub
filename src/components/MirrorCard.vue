<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  mirror: { type: Object, required: true },
  categoryName: { type: String, required: true }
})

const emit = defineEmits(['show-config'])

const copiedKey = ref('')

async function copyText(text, key) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => (copiedKey.value = ''), 1500)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}

/* ---------- 手动延迟测试 ----------
 * 使用 fetch no-cors 模式：镜像站大多不允许跨域读取响应，
 * no-cors 只负责发请求与计时，能完成请求即视为连通（与后端脚本判定一致），
 * 网络错误 / 超时视为不可用。
 */
const PING_TIMEOUT = 8000
const testing = ref(false)
const liveTest = ref(null) // { ok, latency, error }

async function runLatencyTest() {
  if (testing.value) return
  testing.value = true
  liveTest.value = null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), PING_TIMEOUT)
  const start = performance.now()
  try {
    await fetch(props.mirror.url, { mode: 'no-cors', signal: ctl.signal, cache: 'no-store' })
    liveTest.value = { ok: true, latency: Math.round(performance.now() - start) }
  } catch (err) {
    liveTest.value = {
      ok: false,
      latency: Math.round(performance.now() - start),
      error: err?.name === 'AbortError' ? '超时' : '无法连接'
    }
  } finally {
    clearTimeout(timer)
    testing.value = false
  }
}

const status = computed(() => {
  // 测试中优先展示检测中状态
  if (testing.value) return { label: '检测中…', cls: 'unknown', latency: null }
  // 有本地实测结果时，就地替换右上角的延迟显示
  if (liveTest.value) {
    return liveTest.value.ok
      ? { label: '实测', cls: 'ok', latency: liveTest.value.latency }
      : { label: '实测失败', cls: 'down', latency: null }
  }
  const lc = props.mirror.lastCheck
  if (!lc) return { label: '未检测', cls: 'unknown' }
  return lc.ok
    ? { label: '正常', cls: 'ok', latency: lc.latency }
    : { label: '异常', cls: 'down' }
})

const statusDetail = computed(() => {
  const lc = props.mirror.lastCheck
  if (!lc) return '尚未检测'
  if (lc.ok) return `${lc.status} 响应 · ${lc.latency}ms`
  return lc.error ? `连接失败：${lc.error}` : '连接失败'
})
</script>

<template>
  <article class="card">
    <header class="card-head">
      <div class="card-title">
        <h3>{{ mirror.name }}</h3>
        <span class="provider">{{ mirror.provider }}</span>
      </div>
      <span
        class="status"
        :class="[status.cls, { loading: testing }]"
        :title="testing ? '正在按当前网络实测延迟…' : '点击按当前网络实测延迟'"
        role="button"
        @click="runLatencyTest"
      >
        <i class="dot" />
        {{ status.label }}
        <em v-if="status.latency != null">{{ status.latency }}ms</em>
      </span>
    </header>

    <p class="desc">{{ mirror.desc }}</p>

    <div class="url-row">
      <span class="cat-tag">{{ categoryName }}</span>
      <code class="url">{{ mirror.url }}</code>
      <button class="copy-btn" @click="copyText(mirror.url, 'url')">
        {{ copiedKey === 'url' ? '已复制' : '复制' }}
      </button>
    </div>

    <div v-if="mirror.usage" class="config-row">
      <button class="config-entry" @click="emit('show-config', mirror)">
        <span>配置方式 · {{ mirror.usage.label }}</span>
        <span class="arrow">›</span>
      </button>
    </div>

    <footer class="card-foot">
      <span class="status-detail">{{ statusDetail }}</span>
      <span v-if="mirror.lastCheck" class="check-time">
        检测于 {{ new Date(mirror.lastCheck.time).toLocaleDateString('zh-CN') }}
        {{ new Date(mirror.lastCheck.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
      </span>
    </footer>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  background: #fafafa;
  box-shadow: 0 2px 12px var(--shadow);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-title h3 {
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-3);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 1px 8px;
}

.status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.status:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: var(--border);
}

.status.loading {
  cursor: wait;
}

.status em {
  font-style: normal;
  color: var(--text-3);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background: var(--text-3);
}

.status.ok .dot {
  background: var(--ok);
}

.status.down .dot {
  background: var(--down);
}

.desc {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cat-tag {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-2);
  background: #f0f0f1;
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}

.url {
  flex: 1;
  min-width: 0;
  color: var(--text);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #fafafa;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
}

.copy-btn {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 3px 10px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.copy-btn:hover {
  background: var(--text);
  color: #fff;
}

/* 配置弹窗入口 */
.config-row {
  margin-top: 2px;
}

.config-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font-size: 12px;
  color: var(--text-2);
  background: #fafafa;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 7px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.config-entry:hover {
  background: #f0f0f1;
  border-color: var(--border-strong);
}

.arrow {
  color: var(--text-3);
  font-size: 16px;
  line-height: 1;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-3);
}

.status-detail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-time {
  flex-shrink: 0;
}
</style>
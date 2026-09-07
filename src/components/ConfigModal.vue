<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  mirror: { type: Object, required: true },
  categoryName: { type: String, required: true }
})

const emit = defineEmits(['close'])

const copied = ref('')

async function copyText(text, key) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const usage = computed(() => props.mirror.usage ?? null)
const status = computed(() => {
  const lc = props.mirror.lastCheck
  if (!lc) return { label: '未检测', cls: 'unknown' }
  return lc.ok
    ? { label: '正常', cls: 'ok', latency: lc.latency }
    : { label: '异常', cls: 'down' }
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-label="镜像配置方法">
      <header class="modal-head">
        <div>
          <div class="head-title">
            <h3>{{ mirror.name }}</h3>
            <span class="provider">{{ mirror.provider }}</span>
            <span class="status" :class="status.cls">
              <i class="dot" />{{ status.label }}
              <em v-if="status.latency != null">{{ status.latency }}ms</em>
            </span>
          </div>
          <p class="subtitle">{{ categoryName }} &middot; {{ mirror.desc }}</p>
        </div>
        <button class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="modal-body">
        <section class="section">
          <div class="section-head">
            <h4>镜像地址</h4>
          </div>
          <div class="url-row">
            <code class="url">{{ mirror.url }}</code>
            <button class="copy-btn" @click="copyText(mirror.url, 'url')">
              {{ copied === 'url' ? '已复制' : '复制' }}
            </button>
          </div>
        </section>

        <section v-if="usage" class="section">
          <div class="section-head">
            <h4>配置方法 · {{ usage.label }}</h4>
          </div>

          <ol class="steps">
            <li v-for="(step, i) in usage.steps" :key="i" class="step">
              <div class="step-head">
                <span class="step-no">{{ i + 1 }}</span>
                <span class="step-note">{{ step.note }}</span>
                <button class="copy-btn" @click="copyText(step.cmd, 'step-' + i)">
                  {{ copied === 'step-' + i ? '已复制' : '复制' }}
                </button>
              </div>
              <pre class="cmd">{{ step.cmd }}</pre>
            </li>
          </ol>

          <ul v-if="usage.notes?.length" class="notes">
            <li v-for="(n, i) in usage.notes" :key="i" class="note">
              <span class="note-mark">注</span>{{ n }}
            </li>
          </ul>
        </section>

        <p v-else class="no-usage">该条目暂无配置说明</p>

        <footer class="modal-foot">
          状态为自动检测结果（借助 GitHub Actions 每日执行，任何状态码响应均视为在线）；右侧「复制」可直接复制命令使用。
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 24, 27, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}

.modal {
  width: 640px;
  max-width: 100%;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
}

.modal-head {
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.head-title h3 {
  font-size: 17px;
  font-weight: 700;
}

.provider {
  font-size: 11px;
  color: var(--text-3);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 1px 8px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-2);
  padding: 2px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.status em {
  font-style: normal;
  color: var(--text-3);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-3);
}

.status.ok .dot {
  background: var(--ok);
}

.status.down .dot {
  background: var(--down);
}

.subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-2);
}

.close-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text);
}

.modal-body {
  padding: 16px 22px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-head h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 8px;
}

.url-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text);
  background: #fafafa;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: all;
}

.copy-btn {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-2);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.copy-btn:hover {
  background: var(--text);
  color: #fff;
}

.steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.step-no {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-note {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-2);
}

.cmd {
  background: #fafafa;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.7;
}

.notes {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px dashed var(--border);
}

.note {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: var(--text-2);
}

.note-mark {
  flex-shrink: 0;
  height: fit-content;
  font-size: 10px;
  color: var(--text-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 0 4px;
  line-height: 1.5;
}

.no-usage {
  font-size: 13px;
  color: var(--text-3);
}

.modal-foot {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.6;
}
</style>
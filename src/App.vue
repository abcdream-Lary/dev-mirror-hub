<script setup>
import { ref, computed, onMounted } from 'vue'
import MirrorCard from './components/MirrorCard.vue'
import ConfigModal from './components/ConfigModal.vue'

const data = ref(null)
const loadError = ref(false)
const activeCategory = ref('all')
const keyword = ref('')
const sortMode = ref('default') // default | latency
const configTarget = ref(null) // 弹窗当前展示的镜像

const openConfig = (m) => {
  configTarget.value = m
}

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/mirrors.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch {
    loadError.value = true
  }
})

const categories = computed(() => data.value?.categories ?? [])
const mirrors = computed(() => data.value?.mirrors ?? [])
const categoryName = (id) =>
  categories.value.find((c) => c.id === id)?.name ?? id

const currentCategoryName = computed(() =>
  activeCategory.value === 'all' ? '全部镜像' : categoryName(activeCategory.value)
)

const filteredMirrors = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return mirrors.value.filter((m) => {
    const catOk = activeCategory.value === 'all' || m.category === activeCategory.value
    if (!catOk) return false
    if (!kw) return true
    const usageText = [m.usage?.label ?? '', ...(m.usage?.steps?.map((s) => s.cmd) ?? [])].join(' ')
    return [m.name, m.desc, m.url, m.provider, usageText].join(' ').toLowerCase().includes(kw)
  })
})

const countByCategory = (id) =>
  mirrors.value.filter((m) => m.category === id).length

// 侧边栏底部：全站状态摘要
const allStats = computed(() => {
  const list = mirrors.value
  const checked = list.filter((m) => m.lastCheck)
  return {
    ok: checked.filter((m) => m.lastCheck.ok).length,
    down: checked.filter((m) => !m.lastCheck.ok).length,
    unknown: list.length - checked.length
  }
})

const sortedMirrors = computed(() => {
  const list = filteredMirrors.value
  if (sortMode.value !== 'latency') return list
  return [...list].sort((a, b) => {
    const oka = a.lastCheck?.ok
    const okb = b.lastCheck?.ok
    if (oka && okb) return (a.lastCheck.latency ?? 0) - (b.lastCheck.latency ?? 0)
    if (oka !== okb) return oka ? -1 : 1
    return 0
  })
})

const updatedText = computed(() => {
  const t = data.value?.meta?.updatedAt
  if (!t) return '尚未检测'
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})
</script>

<template>
  <div v-if="loadError" class="error-wrap">
    <div class="error">
      数据加载失败（data/mirrors.json 不存在或未部署）。请先在仓库运行
      <code>npm run check</code> 生成该文件。
    </div>
  </div>

  <div v-else-if="data" class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">M</span>
        <div class="brand-text">
          <h1>Dev Mirror Hub</h1>
          <p>开发环境国内镜像速查</p>
        </div>
      </div>

      <nav class="pill-list">
        <button
          class="pill"
          :class="{ active: activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          <span class="pill-name">全部</span>
          <span class="pill-count">{{ mirrors.length }}</span>
        </button>
        <button
          v-for="c in categories"
          :key="c.id"
          class="pill"
          :class="{ active: activeCategory === c.id }"
          @click="activeCategory = c.id"
        >
          <span class="pill-name">{{ c.name }}</span>
          <span class="pill-count">{{ countByCategory(c.id) }}</span>
        </button>
      </nav>

      <div class="sidebar-foot">
        <div class="foot-stats">
          <span class="foot-item"><i class="dot ok" />在线 {{ allStats.ok }}</span>
          <span class="foot-item"><i class="dot down" />异常 {{ allStats.down }}</span>
          <span v-if="allStats.unknown" class="foot-item"><i class="dot unknown" />未检测 {{ allStats.unknown }}</span>
        </div>
        <div class="foot-updated">自动检测更新于 {{ updatedText }}</div>
      </div>
    </aside>

    <main class="content">
      <header class="topbar">
        <h2>{{ currentCategoryName }}</h2>
        <div class="topbar-actions">
          <input
            v-model="keyword"
            class="search"
            type="search"
            placeholder="搜索镜像名称 / 地址 / 关键词…"
          />
          <div class="sort-toggle" role="group" aria-label="排序方式">
            <button
              class="sort-btn"
              :class="{ active: sortMode === 'default' }"
              @click="sortMode = 'default'"
            >
              默认
            </button>
            <button
              class="sort-btn"
              :class="{ active: sortMode === 'latency' }"
              :title="'按自动检测延迟排序（局域网实测结果不计入）'"
              @click="sortMode = 'latency'"
            >
              按延迟
            </button>
          </div>
        </div>
      </header>

      <main v-if="sortedMirrors.length" class="grid">
        <MirrorCard
          v-for="m in sortedMirrors"
          :key="m.id"
          :mirror="m"
          :category-name="categoryName(m.category)"
          @show-config="openConfig"
        />
      </main>
      <p v-else class="empty">没有匹配的镜像</p>

      <footer class="footer">
        状态由 GitHub Actions 每日自动检测：任何状态码响应均视为在线（4xx/5xx 说明服务可达）；
        「测延迟」为本机实时探测，结果受本地网络影响，仅作参考。Docker Hub 加速器随时可能调整，建议同时配置多个源。
      </footer>
    </main>

    <ConfigModal
      v-if="configTarget"
      :mirror="configTarget"
      :category-name="categoryName(configTarget.category)"
      @close="configTarget = null"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

/* ---------- 侧边栏 ---------- */
.sidebar {
  width: 236px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 22px 14px 16px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 18px;
  border-bottom: 1px solid var(--sidebar-line);
  margin-bottom: 16px;
}

.brand-mark {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-lg);
  background: var(--card);
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text h1 {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1.3;
}

.brand-text p {
  font-size: 11px;
  color: var(--sidebar-muted);
  line-height: 1.3;
}

/* 药丸分类列表 */
.pill-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--sidebar-muted);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.pill:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text);
}

.pill.active {
  background: var(--card);
  color: var(--text);
  font-weight: 600;
}

.pill-count {
  flex-shrink: 0;
  min-width: 22px;
  text-align: center;
  font-size: 11px;
  line-height: 1.6;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--sidebar-muted);
}

.pill.active .pill-count {
  background: var(--border-strong);
  color: var(--text-2);
}

/* 侧边栏底部状态 */
.sidebar-foot {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--sidebar-line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.foot-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: var(--sidebar-text);
}

.foot-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.ok {
  background: var(--ok);
}

.dot.down {
  background: var(--down);
}

.dot.unknown {
  background: var(--text-3);
}

.foot-updated {
  font-size: 11px;
  color: var(--sidebar-muted);
}

/* ---------- 内容区 ---------- */
.content {
  flex: 1;
  min-width: 0;
  padding: 26px 30px 48px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.topbar h2 {
  font-size: 20px;
  font-weight: 700;
}

.search {
  width: 280px;
  font-size: 13px;
  color: var(--text);
  background: var(--card);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 8px 16px;
  outline: none;
  transition: border-color 0.15s ease;
}

.search:focus {
  border-color: var(--text);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-toggle {
  display: flex;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
}

.sort-btn {
  font-size: 12px;
  color: var(--text-3);
  background: transparent;
  border: none;
  padding: 7px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sort-btn:hover {
  background: #ececee;
  color: var(--text-2);
}

.sort-btn.active {
  background: var(--border-strong);
  color: var(--text-2);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
  gap: 14px;
}

.empty {
  padding: 60px 0;
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
}

.error-wrap {
  max-width: 720px;
  margin: 40px auto;
  padding: 0 20px;
}

.error {
  background: var(--card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--down);
  border-radius: var(--radius-lg);
  padding: 16px;
  font-size: 13px;
  color: var(--text-2);
}

.error code {
  background: #f0f0f1;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-3);
}

/* ---------- 响应式：窄屏时侧边栏转为顶部横向导航 ---------- */
@media (max-width: 820px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    position: static;
    padding: 14px 14px 10px;
  }

  .brand {
    padding-bottom: 12px;
    margin-bottom: 10px;
  }

  .pill-list {
    flex-direction: row;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .pill-list::-webkit-scrollbar {
    display: none;
  }

  .pill {
    width: auto;
    flex-shrink: 0;
  }

  .sidebar-foot {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .content {
    padding: 18px 16px 40px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .topbar-actions {
    flex-wrap: wrap;
  }

  .search {
    width: 100%;
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
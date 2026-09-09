<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  getMySeries,
  updateSeries,
  getMySeriesMembers,
  addToMySeries,
  moveMySeriesArticle,
  removeMySeriesArticle,
  skipReasonText,
  getMyArticles,
} from '../api/article';
import type {
  ArticleInfo,
  SeriesAddResult,
  SeriesMemberItem,
  SeriesSaveDto,
  SeriesSkipItem,
} from '../api/article';
import { useToast } from '../composables/useToast';
import CreatorPagination from '../components/CreatorPagination.vue';

/**
 * 创作中心「我的专栏」作者专属编辑页（spec §十，Task 19）：
 * 顶部基础信息表单（PUT /creator/series/{id}，编辑分支始终携带 description/coverUrl，
 * 传 '' 即清空）+ 中部成员列表（↑↓ 按 sortOrder 边界禁用 / 移除）+ 弹窗批量添加我已发布的文章
 * （宽容语义：违规文章后端逐篇跳过，前端按 reasonCode 逐条 i18n 文案提示）。
 *
 * 详情数据源：creator 无单栏 GET 接口 → 用「我的专栏」列表按路由 id 查找；
 * 列表中没有该栏说明非本人（含站长级专栏）或不存在 → 视为无权限，提示后回专栏列表
 * （不再触发成员接口的 403）。
 */
const props = defineProps<{ id: string }>();
const { t } = useI18n();
const toast = useToast();
const router = useRouter();

// ---- 顶部：专栏基础信息 ----
const form = reactive({ name: '', description: '', coverUrl: '' });
const isSavingInfo = ref(false);

async function saveInfo() {
  if (isSavingInfo.value) return;
  const name = form.name.trim();
  if (!name) {
    toast.addToast(t('creator.columnNameRequired'), 'warning');
    return;
  }
  isSavingInfo.value = true;
  // name 必填；编辑分支必须始终携带两字段（trim 后可为 ''）：
  // 后端 updateSeries 无条件 set，传 '' 即清空、省略=保留旧值
  const payload: SeriesSaveDto = {
    name,
    description: form.description.trim(),
    coverUrl: form.coverUrl.trim(),
  };
  try {
    const res = await updateSeries(props.id, payload);
    if (res.isSuccess) {
      toast.addToast(t('creator.columnUpdated'), 'success');
    }
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    isSavingInfo.value = false;
  }
}

// ---- 中部：成员列表（含草稿，sort_order 升序） ----
const members = ref<SeriesMemberItem[]>([]);
const isPageLoading = ref(false);
const pageLoadFailed = ref(false);
// 列表无该栏（非本人/不存在）→ 隐藏正文（无权限 toast 后马上回列表，避免空表单闪现）
const forbidden = ref(false);
const isMembersLoading = ref(false);
const membersLoadFailed = ref(false);
// 上移/下移/移除进行中：统一禁点，防止连续点击造成重复交换
const rowBusy = ref(false);

async function loadPage() {
  isPageLoading.value = true;
  pageLoadFailed.value = false;
  membersLoadFailed.value = false;
  try {
    const res = await getMySeries();
    if (!res.isSuccess) {
      // 列表请求业务失败：拦截器已气泡提示，页内给重试
      pageLoadFailed.value = true;
      return;
    }
    const found = (res.data ?? []).find((s) => s.id === props.id);
    if (!found) {
      // 非本人（含站长级专栏）/不存在 → 无权限，回专栏列表
      forbidden.value = true;
      toast.addToast(t('creator.columnForbidden'), 'warning');
      await router.replace('/creator/columns');
      return;
    }
    forbidden.value = false;
    form.name = found.name;
    form.description = found.description ?? '';
    form.coverUrl = found.coverUrl ?? '';
    await loadMembers();
  } catch {
    pageLoadFailed.value = true;
  } finally {
    isPageLoading.value = false;
  }
}

async function loadMembers() {
  isMembersLoading.value = true;
  membersLoadFailed.value = false;
  try {
    const res = await getMySeriesMembers(props.id);
    if (res.isSuccess) {
      members.value = res.data ?? [];
    } else {
      // 拦截器已气泡提示（如并发下专栏被删）
      membersLoadFailed.value = true;
    }
  } catch {
    membersLoadFailed.value = true;
  } finally {
    isMembersLoading.value = false;
  }
}

function memberStatusText(status: string): string {
  switch (status) {
    case 'published':
      return t('creator.published');
    case 'draft':
      return t('creator.drafts');
    case 'archived':
      return t('creator.archived');
    default:
      return status;
  }
}

async function moveMember(m: SeriesMemberItem, direction: 'up' | 'down') {
  if (rowBusy.value) return;
  rowBusy.value = true;
  try {
    const res = await moveMySeriesArticle(props.id, m.articleId, direction);
    if (res.isSuccess) await loadMembers();
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    rowBusy.value = false;
  }
}

async function removeMember(m: SeriesMemberItem) {
  if (rowBusy.value) return;
  const confirmed = window.confirm(t('creator.removeMemberConfirm', { title: m.title }));
  if (!confirmed) return;
  rowBusy.value = true;
  try {
    const res = await removeMySeriesArticle(props.id, m.articleId);
    if (res.isSuccess) await loadMembers();
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    rowBusy.value = false;
  }
}

// ---- 「添加文章」弹窗：候选 = 我的已发布文章（getMyArticles status=published，10/页，
//      与创作中心 CreatorPublished 同一接口形态）；已在专栏内的文章过滤不展示 ----
const addOpen = ref(false);
const addPhase = ref<'pick' | 'result'>('pick');
const candidates = ref<ArticleInfo[]>([]);
const candidateTotal = ref(0);
const candidateTotalPages = ref(0);
const candidatePage = ref(1);
const candidatesLoading = ref(false);
const picked = ref<ArticleInfo[]>([]);
const isSubmittingAdd = ref(false);
const addResult = ref<SeriesAddResult | null>(null);

const memberIdSet = computed(() => new Set(members.value.map((m) => m.articleId)));
// 本页候选全部已在专栏内但其它页还有候选时，提示与"完全没候选"区分开
const pageEmpty = computed(() => candidates.value.length === 0 && candidateTotal.value > 0);

function openAdd() {
  candidatePage.value = 1;
  candidateTotal.value = 0;
  candidateTotalPages.value = 0;
  candidates.value = [];
  picked.value = [];
  addPhase.value = 'pick';
  addResult.value = null;
  addOpen.value = true;
  void loadCandidates(1);
}

async function loadCandidates(page: number) {
  candidatesLoading.value = true;
  try {
    const res = await getMyArticles({ status: 'published', pageNum: page, pageSize: 10 });
    if (res.isSuccess && res.data) {
      candidates.value = res.data.data.filter((a) => !memberIdSet.value.has(a.id));
      candidateTotal.value = res.data.total;
      candidateTotalPages.value = res.data.totalPages;
      candidatePage.value = res.data.currentPage;
    } else {
      candidates.value = [];
    }
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示；候选留空展示空态
    candidates.value = [];
  } finally {
    candidatesLoading.value = false;
  }
}

function togglePick(a: ArticleInfo) {
  const i = picked.value.findIndex((p) => p.id === a.id);
  if (i >= 0) picked.value.splice(i, 1);
  else picked.value.push(a);
}

function isPicked(a: ArticleInfo): boolean {
  return picked.value.some((p) => p.id === a.id);
}

async function submitAdd() {
  if (isSubmittingAdd.value || picked.value.length === 0) return;
  isSubmittingAdd.value = true;
  try {
    const res = await addToMySeries(
      props.id,
      picked.value.map((a) => a.id),
    );
    if (res.isSuccess) {
      addResult.value = res.data ?? { addedCount: 0, skipped: [] };
      addPhase.value = 'result';
      // 结果留在弹窗内逐条展示；成员区立刻刷新
      void loadMembers();
    }
  } catch {
    // 请求错误已由拦截器统一顶部气泡提示
  } finally {
    isSubmittingAdd.value = false;
  }
}

function closeAdd() {
  if (isSubmittingAdd.value) return;
  addOpen.value = false;
  addResult.value = null;
}

/** skipped 逐条：文章标题 + 本地化原因（标题取自已勾选候选；个别拿不到标题回退 articleId） */
function skipLine(s: SeriesSkipItem): string {
  const article = picked.value.find((a) => a.id === s.articleId);
  const title = article?.title ?? s.articleId;
  const why = t(skipReasonText(s.reasonCode));
  return why ? `${title}：${why}` : title;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 路由参数变化（编辑不同专栏）时整体重载；Esc 关闭添加弹窗
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && addOpen.value) closeAdd();
}

watch(
  () => props.id,
  () => {
    addOpen.value = false;
    members.value = [];
    void loadPage();
  },
  { immediate: true },
);

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="cce-page">
    <div class="cce-nav">
      <router-link to="/creator/columns" class="cce-back">← {{ t('creator.backToColumns') }}</router-link>
      <h2 class="cce-title">{{ t('creator.editColumn') }}</h2>
    </div>

    <p v-if="isPageLoading" class="cce-hint">{{ t('common.loading') }}</p>
    <div v-else-if="pageLoadFailed" class="cce-failed">
      <p class="cce-failed__text">{{ t('creator.columnLoadFailed') }}</p>
      <button type="button" class="cce-btn cce-btn--outline cce-retry" @click="loadPage">
        {{ t('creator.columnRetry') }}
      </button>
    </div>
    <!-- 无权限：正文隐藏，等待返回专栏列表 -->
    <template v-else-if="forbidden" />
    <template v-else>
      <!-- 顶部：基础信息表单 -->
      <section class="cce-card">
        <div class="cce-field">
          <label class="cce-label" for="column-name">
            {{ t('creator.columnName') }} <em class="cce-required">*</em>
          </label>
          <input
            id="column-name"
            v-model="form.name"
            type="text"
            class="cce-input"
            :placeholder="t('creator.columnNamePlaceholder')"
          />
        </div>
        <div class="cce-field">
          <label class="cce-label" for="column-desc">{{ t('creator.columnDescription') }}</label>
          <textarea
            id="column-desc"
            v-model="form.description"
            rows="3"
            class="cce-input"
            :placeholder="t('creator.columnDescriptionPlaceholder')"
          ></textarea>
        </div>
        <div class="cce-field">
          <label class="cce-label" for="column-cover">{{ t('creator.columnCover') }}</label>
          <input
            id="column-cover"
            v-model="form.coverUrl"
            type="text"
            class="cce-input"
            :placeholder="t('creator.columnCoverPlaceholder')"
          />
          <img v-if="form.coverUrl.trim()" :src="form.coverUrl.trim()" alt="" class="cce-cover-preview" />
        </div>
        <div class="cce-actions">
          <button type="button" class="cce-btn cce-btn--primary cce-save-btn" :disabled="isSavingInfo" @click="saveInfo">
            <span v-if="isSavingInfo" class="cce-spinner"></span>
            {{ t('creator.save') }}
          </button>
        </div>
      </section>

      <!-- 中部：成员列表 -->
      <section class="cce-card">
        <div class="cce-card__head">
          <h3 class="cce-card__title">{{ t('creator.columnMembers') }}</h3>
          <button type="button" class="cce-btn cce-btn--add btn-add-members" @click="openAdd">
            {{ t('creator.addArticles') }}
          </button>
        </div>

        <p v-if="isMembersLoading" class="cce-hint">{{ t('common.loading') }}</p>
        <div v-else-if="membersLoadFailed" class="cce-failed">
          <p class="cce-failed__text">{{ t('creator.columnLoadFailed') }}</p>
          <button type="button" class="cce-btn cce-btn--outline cce-retry" @click="loadMembers">
            {{ t('creator.columnRetry') }}
          </button>
        </div>
        <p v-else-if="members.length === 0" class="cce-hint">{{ t('creator.emptyColumnMembers') }}</p>
        <ul v-else class="cce-members">
          <li v-for="(m, idx) in members" :key="m.articleId" class="cce-member">
            <img v-if="m.coverUrl" :src="m.coverUrl" alt="" class="cce-member__cover" />
            <span v-else class="cce-member__cover cce-member__cover--placeholder" />
            <div class="cce-member__info">
              <div class="cce-member__title">{{ m.title }}</div>
              <span class="cce-member__status" :class="`cce-member__status--${m.status}`">
                {{ memberStatusText(m.status) }}
              </span>
            </div>
            <div class="cce-member__actions">
              <button
                type="button"
                class="cce-move-btn cce-move-btn--up"
                :disabled="rowBusy || idx === 0"
                :aria-label="t('creator.moveUp')"
                :title="t('creator.moveUp')"
                @click="moveMember(m, 'up')"
              >
                ↑
              </button>
              <button
                type="button"
                class="cce-move-btn cce-move-btn--down"
                :disabled="rowBusy || idx === members.length - 1"
                :aria-label="t('creator.moveDown')"
                :title="t('creator.moveDown')"
                @click="moveMember(m, 'down')"
              >
                ↓
              </button>
              <button type="button" class="cce-remove-btn" :disabled="rowBusy" @click="removeMember(m)">
                {{ t('creator.removeMember') }}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- 「添加文章」弹窗（多选我的已发布文章，翻页保留勾选） -->
    <Teleport to="body">
      <div v-if="addOpen" class="cce-overlay" @click.self="closeAdd">
        <div class="cce-modal" role="dialog" aria-modal="true" :aria-label="t('creator.addModalTitle')">
          <div class="cce-modal__head">
            <h3 class="cce-modal__title">
              {{ addPhase === 'pick' ? t('creator.addModalTitle') : t('creator.addResultTitle') }}
            </h3>
            <button type="button" class="cce-modal__close" :disabled="isSubmittingAdd" @click="closeAdd">✕</button>
          </div>

          <template v-if="addPhase === 'pick'">
            <p v-if="candidatesLoading" class="cce-modal__hint">{{ t('common.loading') }}</p>
            <p v-else-if="candidates.length === 0" class="cce-modal__hint">
              {{ pageEmpty ? t('creator.addModalPageEmpty') : t('creator.addModalEmpty') }}
            </p>
            <ul v-else class="cce-picks">
              <li v-for="a in candidates" :key="a.id" class="cce-pick">
                <label class="cce-pick__label">
                  <input
                    type="checkbox"
                    class="cce-pick__check"
                    :checked="isPicked(a)"
                    @change="togglePick(a)"
                  />
                  <span class="cce-pick__body">
                    <span class="cce-pick__title">{{ a.title }}</span>
                    <span class="cce-pick__date">{{ formatDate(a.publishAt) }}</span>
                  </span>
                </label>
              </li>
            </ul>
            <CreatorPagination
              v-if="candidateTotalPages > 1 && !candidatesLoading"
              :current-page="candidatePage"
              :total-pages="candidateTotalPages"
              @page-change="loadCandidates"
            />
            <div class="cce-modal__foot">
              <span class="cce-modal__count">{{ t('creator.addModalSelected', { count: picked.length }) }}</span>
              <button type="button" class="cce-btn cce-btn--outline" :disabled="isSubmittingAdd" @click="closeAdd">
                {{ t('creator.cancel') }}
              </button>
              <button
                type="button"
                class="cce-btn cce-btn--primary cce-modal__submit"
                :disabled="isSubmittingAdd || picked.length === 0"
                @click="submitAdd"
              >
                <span v-if="isSubmittingAdd" class="cce-spinner"></span>
                {{ t('creator.addModalSubmit') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div v-if="addResult" class="cce-add-result">
              <p v-if="addResult.addedCount > 0" class="cce-add-result__added">
                {{ t('creator.addResultAdded', { count: addResult.addedCount }) }}
              </p>
              <template v-if="addResult.skipped.length > 0">
                <p class="cce-add-result__heading">{{ t('creator.skippedHeading') }}</p>
                <ul class="cce-add-result__skips">
                  <li v-for="s in addResult.skipped" :key="s.articleId" class="cce-add-result__skip">
                    {{ skipLine(s) }}
                  </li>
                </ul>
              </template>
              <p v-else-if="addResult.addedCount === 0" class="cce-add-result__heading">
                {{ t('creator.noneAdded') }}
              </p>
            </div>
            <div class="cce-modal__foot">
              <button type="button" class="cce-btn cce-btn--primary cce-modal__done" @click="closeAdd">
                {{ t('creator.done') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.cce-page {
  min-width: 0;
}

.cce-nav {
  margin-bottom: 16px;
}

.cce-back {
  display: inline-block;
  font-size: 0.85rem;
  color: $color-text-secondary;
  text-decoration: none;
  margin-bottom: 6px;
  transition: color 0.2s;

  &:hover {
    color: $color-accent-primary;
  }
}

.cce-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: $color-text-primary;
}

.cce-card {
  background: $color-card-bg;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  padding: 20px;
  margin-bottom: 16px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: $color-text-primary;
  }
}

.cce-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.cce-label {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-secondary;
}

.cce-required {
  color: #ef4444;
  font-style: normal;
}

.cce-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-bg-secondary;
  color: $color-text-primary;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
  resize: vertical;
  transition: all 0.2s;

  &::placeholder {
    color: rgba($color-text-primary, 0.4);
  }

  &:focus {
    outline: none;
    border-color: $color-accent-primary;
    box-shadow: 0 0 0 2px rgba($color-accent-primary-rgb, 0.15);
  }
}

.cce-cover-preview {
  margin-top: 6px;
  max-height: 80px;
  max-width: 220px;
  border-radius: $radius-sm;
  border: 1px solid $color-border;
  object-fit: cover;
}

.cce-actions {
  display: flex;
  justify-content: flex-end;
}

.cce-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid transparent;
  border-radius: $radius-md;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;

  &--primary {
    background: $color-accent-primary;
    color: #fff;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }

  &--outline {
    background: transparent;
    color: $color-text-secondary;
    border-color: $color-border;

    &:hover:not(:disabled) {
      color: $color-text-primary;
      background: $color-bg-secondary;
    }
  }

  &--add {
    background: $color-accent-primary;
    color: #fff;
    padding: 6px 14px;
    font-size: 0.85rem;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.cce-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  border-top-color: #fff;
  animation: cce-spin 0.8s linear infinite;
}

@keyframes cce-spin {
  to { transform: rotate(360deg); }
}

.cce-hint {
  margin: 0;
  padding: 32px 8px;
  text-align: center;
  color: $color-text-tertiary;
  font-size: 0.9rem;
}

.cce-failed {
  padding: 28px 8px;
  text-align: center;

  &__text {
    margin: 0 0 14px;
    color: $color-text-secondary;
    font-size: 0.9rem;
  }
}

.cce-members {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cce-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid $color-border;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &__cover {
    width: 56px;
    height: 36px;
    border-radius: $radius-sm;
    object-fit: cover;
    flex-shrink: 0;

    &--placeholder {
      background: $color-bg-secondary;
      border: 1px solid $color-border;
      display: inline-block;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 0.92rem;
    font-weight: 500;
    color: $color-text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    display: inline-block;
    margin-top: 3px;
    font-size: 0.72rem;
    padding: 1px 8px;
    border-radius: 10px;
    color: $color-text-secondary;
    background: rgba($color-text-secondary, 0.12);

    &--published {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.12);
    }
  }

  &__actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.cce-move-btn {
  width: 30px;
  height: 30px;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text-secondary;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: $color-accent-primary;
    color: $color-accent-primary;
    background: rgba($color-accent-primary-rgb, 0.08);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.cce-remove-btn {
  padding: 5px 10px;
  border: 1px solid #ef4444;
  border-radius: $radius-sm;
  background: transparent;
  color: #ef4444;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: #ef4444;
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ---- 「添加文章」弹窗 ---- */
.cce-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.cce-modal {
  background: $color-bg-primary;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  width: 100%;
  max-width: 560px;
  box-shadow: $shadow-sm;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
  }

  &__title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: $color-text-primary;
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-secondary;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: $color-bg-secondary;
      color: $color-text-primary;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__hint {
    margin: 0;
    padding: 36px 16px;
    text-align: center;
    color: $color-text-tertiary;
    font-size: 0.9rem;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 24px 20px;
  }

  &__count {
    flex: 1;
    font-size: 0.85rem;
    color: $color-text-secondary;
  }
}

.cce-picks {
  list-style: none;
  margin: 16px 0 0;
  padding: 0 8px;
  max-height: 320px;
  overflow-y: auto;
}

.cce-pick {
  &__label {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: $radius-md;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: $color-bg-secondary;
    }
  }

  &__check {
    flex-shrink: 0;
    accent-color: $color-accent-primary;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 0.92rem;
    color: $color-text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__date {
    flex-shrink: 0;
    font-size: 0.78rem;
    color: $color-text-tertiary;
  }
}

.cce-add-result {
  padding: 20px 24px 4px;
  max-height: 360px;
  overflow-y: auto;

  &__added {
    margin: 0 0 10px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #16a34a;
  }

  &__heading {
    margin: 0 0 8px;
    font-size: 0.9rem;
    color: $color-text-secondary;
  }

  &__skips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__skip {
    font-size: 0.88rem;
    color: $color-text-secondary;
    padding: 6px 10px;
    background: rgba(#ef4444, 0.08);
    border-radius: $radius-sm;
    word-break: break-all;
  }
}

// Mobile
@media (max-width: 768px) {
  .cce-member {
    flex-wrap: wrap;
    gap: 8px;
  }

  .cce-member__info {
    flex: 1;
    min-width: calc(100% - 90px);
  }

  .cce-member__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import TechIcon from './icons/TechIcon.vue';

/** 技能总数上限（与后端 UserSkillsJson.MAX_COUNT 对齐） */
const MAX_COUNT = 20;
/** 单条技能名称上限（与后端 UserSkillsJson.MAX_LEN 对齐） */
const MAX_LEN = 30;

const model = defineModel<string[]>({ default: () => [] });
const text = ref('');
defineProps<{ placeholder?: string }>();

const addSkill = () => {
  const skill = text.value.trim();
  if (!skill) return;
  if (skill.length > MAX_LEN) return;
  const existing = model.value.map((s) => s.toLowerCase());
  if (existing.includes(skill.toLowerCase())) return;
  if (model.value.length >= MAX_COUNT) return;
  model.value = [...model.value, skill];
  text.value = '';
};

const removeSkill = (index: number) => {
  model.value = model.value.filter((_, i) => i !== index);
};

const moveSkill = (index: number, delta: -1 | 1) => {
  const target = index + delta;
  if (target < 0 || target >= model.value.length) return;
  const next = [...model.value];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  model.value = next;
};
</script>

<template>
  <div class="skill-editor">
    <ul class="skill-chip-list">
      <li v-for="(skill, i) in model" :key="skill" class="skill-chip">
        <TechIcon :name="skill" :size="14" class="skill-chip__icon" />
        <span class="skill-chip__name">{{ skill }}</span>
        <span class="skill-chip__actions">
          <button
            class="skill-chip__up"
            type="button"
            :disabled="i === 0"
            title="上移"
            @click="moveSkill(i, -1)"
          >↑</button>
          <button
            class="skill-chip__down"
            type="button"
            :disabled="i === model.length - 1"
            title="下移"
            @click="moveSkill(i, 1)"
          >↓</button>
          <button
            class="skill-chip__remove"
            type="button"
            title="删除"
            @click="removeSkill(i)"
          >×</button>
        </span>
      </li>
    </ul>
    <input
      class="skill-editor__input"
      v-model="text"
      :placeholder="placeholder"
      @keydown.enter.prevent="addSkill"
    />
  </div>
</template>

<style scoped>
.skill-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-card-border);
  background: var(--color-card-bg);
  font-size: 0.9rem;
  color: var(--color-text-primary, inherit);
}

.skill-chip__icon {
  flex-shrink: 0;
}

.skill-chip__actions {
  display: inline-flex;
  gap: 2px;
}

.skill-chip__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
}

.skill-chip__actions button:hover:not(:disabled) {
  background: rgba(var(--color-accent-primary-rgb, 96 165 250), 0.15);
}

.skill-chip__actions button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.skill-editor__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-card-border);
  border-radius: 8px;
  background: transparent;
  color: inherit;
}
</style>
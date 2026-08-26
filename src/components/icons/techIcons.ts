import type { Component } from 'vue';

// ============================================================
// 标签名 → 图标解析（TechIcon 的数据层）
// 图标一律来自 Iconify 集合（unplugin-icons 编译期按需打包），
// 不再手抄 SVG path。品牌图标用 Simple Icons，通用图标用 MDI。
// ============================================================

// Brand icons (Simple Icons)
import IconSiSpring from '~icons/simple-icons/spring';
import IconSiSpringboot from '~icons/simple-icons/springboot';
import IconSiOpenjdk from '~icons/simple-icons/openjdk';
import IconSiMysql from '~icons/simple-icons/mysql';
import IconSiRedis from '~icons/simple-icons/redis';
import IconSiRabbitmq from '~icons/simple-icons/rabbitmq';
import IconSiElasticsearch from '~icons/simple-icons/elasticsearch';
import IconSiDocker from '~icons/simple-icons/docker';
import IconSiKubernetes from '~icons/simple-icons/kubernetes';
import IconSiLinux from '~icons/simple-icons/linux';
import IconSiVuedotjs from '~icons/simple-icons/vuedotjs';
import IconSiTypescript from '~icons/simple-icons/typescript';
import IconSiJavascript from '~icons/simple-icons/javascript';
import IconSiVite from '~icons/simple-icons/vite';
import IconSiSass from '~icons/simple-icons/sass';
import IconSiPinia from '~icons/simple-icons/pinia';
import IconSiSwagger from '~icons/simple-icons/swagger';
import IconSiNginx from '~icons/simple-icons/nginx';
import IconSiGit from '~icons/simple-icons/git';
import IconSiGithub from '~icons/simple-icons/github';
import IconSiMarkdown from '~icons/simple-icons/markdown';
import IconSiAmazonwebservices from '~icons/simple-icons/amazonwebservices';
import IconSiGo from '~icons/simple-icons/go';
import IconSiPython from '~icons/simple-icons/python';
import IconSiNodedotjs from '~icons/simple-icons/nodedotjs';
import IconSiReact from '~icons/simple-icons/react';
import IconSiHtml5 from '~icons/simple-icons/html5';
import IconSiCss3 from '~icons/simple-icons/css3';
import IconSiPostman from '~icons/simple-icons/postman';
import IconSiGradle from '~icons/simple-icons/gradle';
import IconSiApachemaven from '~icons/simple-icons/apachemaven';
import IconSiBootstrap from '~icons/simple-icons/bootstrap';
import IconSiTailwindcss from '~icons/simple-icons/tailwindcss';
import IconSiWebpack from '~icons/simple-icons/webpack';
import IconSiVitest from '~icons/simple-icons/vitest';
import IconSiJest from '~icons/simple-icons/jest';
import IconSiIntellijidea from '~icons/simple-icons/intellijidea';

// UI icons (MDI)
import IconMdiLanguageJava from '~icons/mdi/language-java';
import IconMdiLanguageCpp from '~icons/mdi/language-cpp';
import IconMdiLanguageCsharp from '~icons/mdi/language-csharp';
import IconMdiTable from '~icons/mdi/table';
import IconMdiTag from '~icons/mdi/tag';
import IconMdiDatabase from '~icons/mdi/database';
import IconMdiSitemap from '~icons/mdi/sitemap';
import IconMdiSpeedometer from '~icons/mdi/speedometer';
import IconMdiPuzzle from '~icons/mdi/puzzle';
import IconMdiCodeBraces from '~icons/mdi/code-braces';
import IconMdiLayers from '~icons/mdi/layers';

/**
 * 裸标签名（后端返回的 tag.name / TagBadge 的 label）→ 图标组件。
 * 覆盖后端预置的 20 个常用标签（doc/sql/tag_framework_migration.sql）
 * 及常见的自创标签；未命中走 FALLBACK_ICON。
 */
const ALIASES: Record<string, Component> = {
  // JVM 生态
  java: IconMdiLanguageJava,
  openjdk: IconSiOpenjdk,
  spring: IconSiSpring,
  'spring boot': IconSiSpringboot,
  springboot: IconSiSpringboot,
  'spring cloud': IconSiSpring,
  springcloud: IconSiSpring,
  mybatis: IconMdiTable,
  'mybatis-plus': IconMdiTable,
  gradle: IconSiGradle,
  maven: IconSiApachemaven,
  // 数据 / 中间件
  mysql: IconSiMysql,
  redis: IconSiRedis,
  rabbitmq: IconSiRabbitmq,
  elasticsearch: IconSiElasticsearch,
  es: IconSiElasticsearch,
  database: IconMdiDatabase,
  // 部署 / 运维
  docker: IconSiDocker,
  kubernetes: IconSiKubernetes,
  k8s: IconSiKubernetes,
  linux: IconSiLinux,
  nginx: IconSiNginx,
  aws: IconSiAmazonwebservices,
  // 前端
  vue: IconSiVuedotjs,
  'vue 3': IconSiVuedotjs,
  vue3: IconSiVuedotjs,
  vuedotjs: IconSiVuedotjs,
  typescript: IconSiTypescript,
  ts: IconSiTypescript,
  javascript: IconSiJavascript,
  js: IconSiJavascript,
  vite: IconSiVite,
  sass: IconSiSass,
  scss: IconSiSass,
  pinia: IconSiPinia,
  react: IconSiReact,
  html: IconSiHtml5,
  html5: IconSiHtml5,
  css: IconSiCss3,
  css3: IconSiCss3,
  bootstrap: IconSiBootstrap,
  tailwind: IconSiTailwindcss,
  tailwindcss: IconSiTailwindcss,
  webpack: IconSiWebpack,
  vitest: IconSiVitest,
  jest: IconSiJest,
  // 工具 / 其他语言
  git: IconSiGit,
  github: IconSiGithub,
  markdown: IconSiMarkdown,
  md: IconSiMarkdown,
  postman: IconSiPostman,
  intellij: IconSiIntellijidea,
  idea: IconSiIntellijidea,
  go: IconSiGo,
  golang: IconSiGo,
  python: IconSiPython,
  py: IconSiPython,
  node: IconSiNodedotjs,
  nodejs: IconSiNodedotjs,
  'c++': IconMdiLanguageCpp,
  cpp: IconMdiLanguageCpp,
  'c#': IconMdiLanguageCsharp,
  csharp: IconMdiLanguageCsharp,
  swagger: IconSiSwagger,
  springdoc: IconSiSwagger,
  openapi: IconSiSwagger,
  // 中文通用标签：无品牌 logo，用 MDI 语义图标
  微服务: IconMdiLayers,
  架构设计: IconMdiSitemap,
  数据库: IconMdiDatabase,
  性能优化: IconMdiSpeedometer,
  设计模式: IconMdiPuzzle,
  算法: IconMdiCodeBraces,
};

/** 未命中任何别名时的兜底图标（通用 tag 标签） */
export const FALLBACK_ICON = IconMdiTag;

/** 按名字解析图标；兼容 'mdi:github' / 'simple-icons:springboot' 这类带集合前缀的写法 */
export function resolveTechIcon(name: string): Component {
  let n = (name ?? '').trim().toLowerCase();
  if (n.includes(':')) n = n.slice(n.lastIndexOf(':') + 1);
  return ALIASES[n] ?? FALLBACK_ICON;
}

/** 品牌色：按名字命中返回品牌主色，未命中用 currentColor（跟随文字色） */
export function getBrandColor(name: string): string {
  const n = (name ?? '').trim().toLowerCase();
  if (n.includes('java')) return '#f89820';
  if (n.includes('spring')) return '#6db33f';
  if (n.includes('vue')) return '#42b883';
  if (n.includes('typescript')) return '#3178c6';
  if (n.includes('docker')) return '#2496ed';
  if (n.includes('kubernetes') || n.includes('k8s')) return '#326ce5';
  if (n.includes('aws')) return '#ff9900';
  if (n.includes('redis')) return '#dc382d';
  if (n.includes('mysql')) return '#4479a1';
  if (n.includes('elasticsearch')) return '#005571';
  if (n.includes('rabbitmq')) return '#ff6600';
  if (n.includes('linux')) return '#fcc624';
  if (n.includes('git')) return '#f05032';
  if (n.includes('react')) return '#61dafb';
  return 'currentColor';
}

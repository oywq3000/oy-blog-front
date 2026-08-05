<script setup lang="ts">
import { ref, computed, watch, onMounted, onUpdated, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
/* import TagsCard from '../components/TagsCard.vue';
import SeriesCard from '../components/SeriesCard.vue';
import RecommendedCard from '../components/RecommendedCard.vue';
import UserCard from '../components/UserCard.vue';
import ArticleToc from '../components/ArticleToc.vue'; */
import TagBadge from '../components/TagBadge.vue';
import Breadcrumb from '../components/Breadcrumb.vue';
import IconUser from '../components/icons/IconUser.vue';
import IconLike from '../components/icons/IconLike.vue';
import IconStar from '../components/icons/IconStar.vue';
import IconShare from '../components/icons/IconShare.vue';
import CommentItem, { type Comment as UIComment } from '../components/CommentItem.vue';
import { useToast } from '../composables/useToast';
import {
  getArticleBySlug,
  getArticleContent,
  getArticleChapters,
  likeArticle,
  unlikeArticle,
  checkIsLiked,
  checkIsFavorited,
  favoriteArticle,
  unfavoriteArticle,
  checkArticleOwnership,
  type ArticleInfo,
  type ArticleChapter,
  type UserArticleStats
} from '../api/article';
import {
  getComments,
  getReplies,
  addComment,
  replyComment,
  reactToComment,
  type Comment as APIComment,
  type CommentReply as APICommentReply
} from '../api/comment';
import { getUserPublicProfile, type SimpleUserProfile } from '../api/user';
import { useUserStore } from '../store/user';
import { estimateReadingTime, formatReadingTime } from '../utils/readingTime';
// import { MdPreview } from 'md-editor-v3'; // Removed, using MarkdownViewer
// import 'md-editor-v3/lib/preview.css'; // Removed
import MarkdownViewer from '../components/MarkdownViewer.vue';
// import { useTheme } from '../composables/useTheme'; // unused

const { t, locale } = useI18n();
// Performance Monitoring
const perfStart = performance.now();
onMounted(() => {
  // Measure FCP/LCP approximation or just component mount time
  const perfEnd = performance.now();
  console.log(`[Performance] ArticleDetail mounted in ${perfEnd - perfStart}ms`);

  // Copy button listener
  document.addEventListener('click', handleCopyClick);
});

const handleCopyClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('.md-editor-copy-button');
  if (btn) {
    // MdEditor v3 handles the copy, we just show the toast
    // We can delay slightly to ensure it felt like a completed action
    setTimeout(() => {
      addToast(t('articleDetail.copied'), 'success');
    }, 100);
  }
};

onUnmounted(() => {
  document.removeEventListener('click', handleCopyClick);
});

onUpdated(() => {
  // Track re-renders to identify performance bottlenecks
  console.debug('[Performance] ArticleDetail component updated');
});

const props = defineProps<{
  id: string | number
}>();

const router = useRouter();
const userStore = useUserStore();
const { isLoggedIn, user } = userStore; // Destructure for reactive access
// const { theme } = useTheme(); // unused
const { addToast } = useToast();

// Article Data
const articleInfo = ref<ArticleInfo | null>(null);
const isOwner = ref(false);
const authorInfo = ref<UserArticleStats | null>(null);
const simpleAuthorProfile = ref<SimpleUserProfile | null>(null)
const authorName = ref(''); // Reactive state for author name
const articleContent = ref(''); // Stores Markdown
const articleHtml = ref(''); // Stores HTML fallback
const isLoading = ref(false);
const isSubmittingComment = ref(false);
const comments = ref<UIComment[]>([]);
const newComment = ref('');

// Formatted date YYYY-MM-DD HH:mm:ss
const formattedDate = computed(() => {
  const raw = articleInfo.value?.publishAt || articleInfo.value?.createdAt;
  if (!raw) return '';
  const d = new Date(raw);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

// Computed reading time
const readingTime = computed(() => {
  const content = articleContent.value || articleHtml.value || articleInfo.value?.summary || '';
  const minutes = estimateReadingTime(
    typeof content === 'string' ? content : '',
    locale.value
  );
  return formatReadingTime(minutes, locale.value);
});

// Breadcrumb items
const breadcrumbItems = computed(() => [
  { label: articleInfo.value?.title || t('articleDetail.loading'), to: undefined },
]);

// Helper to convert API Reply to UI Comment
const mapReplyToUI = (r: APICommentReply): UIComment => ({
  id: r.id,
  user: r.username || r.userId || 'User',
  userId: r.userId,
  avatar: r.avatar || undefined,
  date: r.replyAt,
  content: r.content,
  likes: 0,
  dislikes: 0,
  userVote: null,
  replies: [] // Will be populated if needed, though backend sends flat list
});

// Map API comment to UI comment
const mapComment = (c: APIComment): UIComment => {
  const root: UIComment = {
    id: c.id,
    // Prefer username from API response, fallback to userId, then "User"
    user: c.username || c.userId || 'User',
    userId: c.userId,
    avatar: c.avatar || undefined,
    // Backend uses commentAt as the primary timestamp
    date: c.commentAt,
    content: c.content,
    likes: 0, // Backend doesn't seem to return likes count in this structure yet
    dislikes: 0,
    userVote: null,
    // Recursively map replies if they exist
    replies: [],
    replyCount: c.replyCount || 0 // Map replyCount
  };

  // Flag to indicate if we need to fetch replies
  // We don't rely on this flag anymore for auto-fetching, but we use replyCount for the button.
  // if (c.hasReply === 1 && (!c.replies || c.replies.length === 0)) {
  //   (root as any)._hasReplyFlag = true;
  // }

  // Build Tree from flat replies
  if (c.replies && c.replies.length > 0) {
    const replyMap = new Map<number, UIComment>();
    const replies = c.replies.map(mapReplyToUI);

    // Index all replies
    replies.forEach(r => replyMap.set(r.id, r));

    // Build hierarchy
    c.replies.forEach((rawReply, index) => {
      const uiReply = replies[index];
      if (rawReply.replyToReplyId) {
        const parent = replyMap.get(rawReply.replyToReplyId);
        if (parent) {
          parent.replies.push(uiReply);
        } else {
          root.replies.push(uiReply);
        }
      } else {
        root.replies.push(uiReply);
      }
    });
  }

  return root;
};


// Cache for usernames to avoid duplicate requests
const usernameCache = new Map<string, UserArticleStats>();


const fetchUserInfo = async (userId: string) => {
  if (!userId || usernameCache.has(userId)) return usernameCache.get(userId);
  try {
    const res = await getUserPublicProfile(userId);
    if (res.isSuccess && res.data) {
      const author = res.data;
      if (author) {
        usernameCache.set(userId, author); // Cache using the ORIGINAL userId as key
        return author;
      }
    }
  } catch (e) {
    console.error('Failed to fetch username for', userId, e);
  }
  return null;
}

const fetchUsername = async (userId: string) => {
  return null;
}


const loadComments = async (articleId: string) => {
  try {
    const res = await getComments(articleId);
    if (res.isSuccess && res.data) {
      // API might return array directly or { items: [] }
      // Based on user feedback: "data": [ { ... }, { ... } ]
      const rawComments = Array.isArray(res.data) ? res.data : (res.data.items || []);
      const mapped = rawComments.map(mapComment);

      // Helper to process a list of comments (including replies)
      const processComments = async (list: UIComment[]) => {
        for (const c of list) {
          // If user looks like an ID (32 chars), try to fetch real name
          // Or if it starts with "User-" followed by ID, maybe we want to check? 
          // Actually, the user complained "User-..." is an ID. 
          // But if the username IS "User-...", we can't do much unless we format it.
          // Let's assume the user mainly wants to fix the raw ID case.
          // But for the "User-..." case, let's try to fetch just in case the API returns a better "username" than what was in the comment object.

          // Check if user is exactly the ID (raw ID case) or "User-"+ID
          const isRawId = c.user.length === 32 && /^[0-9a-fA-F]+$/.test(c.user);
          const isDefaultUser = c.user.startsWith('User-') && c.user.length === 37;

          if (isRawId || isDefaultUser) {
            const name = await fetchUserInfo(c.user);
            if (name) c.user = name;
          }

          // Lazy loading replies is now handled by CommentItem event 'fetch-replies'
          // We just need to ensure if replies are already present, we process them (usernames)

          // Also process replies
          if (c.replies && c.replies.length > 0) {
            await processComments(c.replies);
          }
        }
      };

      await processComments(mapped);
      comments.value = mapped;
    }
  } catch (error) {
    console.error('Failed to load comments:', error);
  }
};
interface ArticleLink {
  id: number | string;
  title: string;
}
const prevArticle = ref<ArticleLink | null>(null);
const nextArticle = ref<ArticleLink | null>(null);

// Comments Data
// Removed duplicate declarations
const isLiked = ref(false); // Local state for like button
const isFavorited = ref(false); // Local state for favorite button

// Chapters Data
const chapters = ref<ArticleChapter[]>([]);
const isLoadingChapters = ref(false);

const loadChapters = async (articleId: string) => {
  isLoadingChapters.value = true;
  try {
    const res = await getArticleChapters(articleId);
    if (res.isSuccess && res.data) {
      chapters.value = res.data;
    } else {
      chapters.value = [];
    }
  } catch (e) {
    console.error('Failed to load chapters:', e);
    chapters.value = [];
  } finally {
    isLoadingChapters.value = false;
  }
};

// Fetch Article Details
const loadArticle = async (slug: string) => {
  isLoading.value = true;
  try {
    // 1. Get Article Metadata
    console.log('Fetching article by slug:', slug);
    const res = await getArticleBySlug(slug);
    console.log('getArticleBySlug raw response:', res);

    // Normalize response: Handle both wrapped ResultObject and direct Article object
    let articleData: ArticleInfo | null = null;
    if (res.isSuccess && res.data) {
      articleData = res.data;
    } else if ((res as any).id) {
      // Fallback: response might be the article object directly
      articleData = res as unknown as ArticleInfo;
    } else if (res.data && res.data.id) {
      // Fallback: response has data but missing isSuccess
      articleData = res.data;
    }

    if (articleData) {
      articleInfo.value = articleData;
      console.log('Article data loaded:', articleData);

      // Author info is now available directly from ArticleInfo
      simpleAuthorProfile.value = {
        name: articleData.authorName || '',
        avatar: articleData.authorAvatar || '',
      };

      if (articleData.id) {
        // Load chapters
        loadChapters(articleData.id);

        // Check user interaction status if logged in
        if (isLoggedIn.value) {
          checkIsLiked(articleData.id).then(res => {
            if (res.isSuccess) isLiked.value = res.data;
          });
          checkIsFavorited(articleData.id).then(res => {
            if (res.isSuccess) isFavorited.value = res.data;
          });
          // Check ownership
          checkArticleOwnership(articleData.id).then(res => {
            if (res.isSuccess) isOwner.value = res.data;
          });
        }
      }

      // 2. Get Content
      console.log('Fetching content for article ID:', articleData.id);
      try {
        const contentRes = await getArticleContent(articleData.id);
        console.log('getArticleContent raw response:', contentRes);

        let contentData: any = null;
        if (contentRes.isSuccess && contentRes.data) {
          contentData = contentRes.data;
        } else if ((contentRes as any).content || (contentRes as any).contentRaw || (contentRes as any).contentMd) {
          // Fallback: response might be the content object directly
          contentData = contentRes;
        } else if (contentRes.data && (contentRes.data.content || contentRes.data.contentRaw || contentRes.data.contentMd)) {
          contentData = contentRes.data;
        }

        if (contentData) {
          // Prioritize Markdown content
          if (contentData.contentMd) {
            articleContent.value = contentData.contentMd;
            articleHtml.value = '';
          } else if (contentData.contentRaw) {
            articleContent.value = contentData.contentRaw;
            articleHtml.value = '';
          }
          // Then HTML content
          else if (contentData.contentHtml) {
            articleHtml.value = contentData.contentHtml;
            articleContent.value = '';
          } else if (contentData.content) {
            articleHtml.value = contentData.content;
            articleContent.value = '';
          } else {
            articleContent.value = articleInfo.value?.summary || `# ${t('articleDetail.noContent')}`;
          }
        } else {
          console.warn('Content response format not recognized', contentRes);
          articleContent.value = articleInfo.value?.summary || `# ${t('articleDetail.noContent')}`;
        }
      } catch (contentError) {
        console.error('Failed to fetch article content:', contentError);
        articleContent.value = articleInfo.value?.summary || `# ${t('articleDetail.loadFailed')}`;
      }

      // 3. Get Comments
      console.log('Loading comments for article ID:', articleData.id);
      loadComments(articleData.id);
    } else {
      console.error('Article data invalid or not found in response:', res);
      // Show error state or message
    }
  } catch (error) {
    console.error('Failed to load article:', error);
  } finally {
    isLoading.value = false;
  }
};

// loadComments removed because it's duplicate. 
// The correct loadComments is defined above.


watch(() => props.id, (newId) => {
  if (newId) {
    loadArticle(newId.toString());
  }
}, { immediate: true });

// Watch for login state changes to update ownership and interaction status
watch(isLoggedIn, (newVal) => {
  if (newVal && articleInfo.value) {
    // Check ownership
    checkArticleOwnership(articleInfo.value.id).then(res => {
      if (res.isSuccess) isOwner.value = res.data;
    });
    // Check interactions
    checkIsLiked(articleInfo.value.id).then(res => {
      if (res.isSuccess) isLiked.value = res.data;
    });
    checkIsFavorited(articleInfo.value.id).then(res => {
      if (res.isSuccess) isFavorited.value = res.data;
    });
  } else if (!newVal) {
    // Reset states on logout
    isOwner.value = false;
    isLiked.value = false;
    isFavorited.value = false;
  }
});

const handleFetchReplies = async (commentId: number) => {
  const comment = findCommentById(comments.value, commentId);
  if (!comment) return;

  // Set a temporary loading state if we had one on UIComment, 
  // but UIComment is defined in CommentItem.vue and we don't have a loading prop there yet in the interface.
  // However, we are passing `loadingReplies` prop to CommentItem in template.
  // We need to track loading state for each comment locally in this component since we can't easily modify the comment object structure reactively without casting.
  // Or better, let's add a reactive Set for loading states.

  if (loadingRepliesSet.value.has(commentId)) return;
  loadingRepliesSet.value.add(commentId);

  try {
    const replyRes = await getReplies(commentId);
    if (replyRes.isSuccess && replyRes.data && replyRes.data.length > 0) {
      const rawReplies = replyRes.data;
      const replyMap = new Map<number, UIComment>();
      const mappedReplies = rawReplies.map(mapReplyToUI);

      mappedReplies.forEach(r => replyMap.set(r.id, r));

      // Rebuild tree
      // Note: replies from this API are flat but contain replyToReplyId
      // We need to attach them to the root comment (which is `comment`)

      // Clear existing replies just in case
      comment.replies = [];

      const rootReplies: UIComment[] = [];

      rawReplies.forEach((rawReply, index) => {
        const uiReply = mappedReplies[index];
        if (rawReply.replyToReplyId) {
          const parent = replyMap.get(rawReply.replyToReplyId);
          if (parent) {
            parent.replies.push(uiReply);
          } else {
            // Fallback if parent not found in this batch (shouldn't happen for valid tree)
            rootReplies.push(uiReply);
          }
        } else {
          rootReplies.push(uiReply);
        }
      });

      // Assign root replies to the main comment
      comment.replies = rootReplies;

      // Fetch usernames for new replies
      // We need to reuse processComments logic or similar
      // Since processComments is inside loadComments, we should extract it or duplicate simple username fetching
      const fetchUsernamesForList = async (list: UIComment[]) => {
        for (const c of list) {
          const isRawId = c.user.length === 32 && /^[0-9a-fA-F]+$/.test(c.user);
          const isDefaultUser = c.user.startsWith('User-') && c.user.length === 37;

          if (isRawId || isDefaultUser) {
            const name = await fetchUsername(c.user);
            if (name) c.user = name;
          }
          if (c.replies.length > 0) {
            await fetchUsernamesForList(c.replies);
          }
        }
      };
      await fetchUsernamesForList(comment.replies);

    }
  } catch (e) {
    console.error('Failed to fetch replies for', commentId, e);
  } finally {
    loadingRepliesSet.value.delete(commentId);
  }
};

const loadingRepliesSet = ref(new Set<number>());


const findCommentById = (items: UIComment[], id: number): UIComment | undefined => {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findCommentById(item.replies, id);
    if (found) return found;
  }
  return undefined;
};

const handleVote = async (commentId: number, type: 'like' | 'dislike') => {
  if (!isLoggedIn.value) {
    alert(t('articleDetail.loginToVote'));
    return;
  }

  // Optimistic update
  const comment = findCommentById(comments.value, commentId);
  if (!comment) return;

  // Call API
  try {
    await reactToComment(type, commentId);
    // Reload comments to get fresh state? Or update locally?
    // Updating locally is complex with logic. 
    // For now, simple reload or just assume success
    if (comment.userVote === type) {
      comment.userVote = null;
      if (type === 'like') comment.likes--; else comment.dislikes--;
    } else {
      if (comment.userVote) {
        if (comment.userVote === 'like') comment.likes--; else comment.dislikes--;
      }
      comment.userVote = type;
      if (type === 'like') comment.likes++; else comment.dislikes++;
    }
  } catch (error) {
    console.error('Failed to vote:', error);
  }
};

const handleReply = async (commentId: number, content: string) => {
  if (!articleInfo.value) return;
  if (!isLoggedIn.value) {
    alert(t('articleDetail.loginToReply'));
    return;
  }

  // Find the comment we are replying to
  let targetComment: UIComment | undefined;
  let rootCommentId: number | undefined;
  let replyToReplyId: number | undefined;

  // Helper to find comment and its root
  const findTarget = (list: UIComment[], rootId: number): boolean => {
    for (const c of list) {
      if (c.id === commentId) {
        targetComment = c;
        rootCommentId = rootId;
        // If the target is NOT the root itself, then it's a reply-to-reply
        if (c.id !== rootId) {
          replyToReplyId = c.id;
        }
        return true;
      }
      if (c.replies && c.replies.length > 0) {
        if (findTarget(c.replies, rootId)) return true;
      }
    }
    return false;
  };

  // Search in root comments
  for (const root of comments.value) {
    if (findTarget([root], root.id)) break;
  }

  if (!targetComment || !rootCommentId) {
    console.error('Target comment not found for id:', commentId);
    return;
  }

  try {
    // replyComment(commentId, content, articleId, replyToReplyId, replyToUserId)
    // commentId param in API is the ROOT comment ID.
    // replyToReplyId is the ID of the reply we are replying to (if any).
    const res = await replyComment(
      rootCommentId,
      content,
      articleInfo.value.id,
      replyToReplyId,
      targetComment.userId
    );

    if (res.isSuccess) {
      // Reload comments
      loadComments(articleInfo.value.id);
    }
  } catch (error) {
    console.error('Failed to reply:', error);
  }
};

const submitComment = async () => {
  if (!newComment.value || !articleInfo.value) return;
  if (!isLoggedIn.value) {
    alert(t('articleDetail.loginToComment'));
    return;
  }

  isSubmittingComment.value = true;
  try {
    const res = await addComment(articleInfo.value.id, newComment.value);
    if (res.isSuccess) {
      newComment.value = '';
      loadComments(articleInfo.value.id);
    }
  } catch (error) {
    console.error('Failed to submit comment:', error);
  } finally {
    isSubmittingComment.value = false;
  }
};

const toggleLike = async () => {
  if (!articleInfo.value) return;
  if (!isLoggedIn.value) {
    alert(t('articleDetail.loginToLike'));
    return;
  }
  try {
    if (isLiked.value) {
      await unlikeArticle(articleInfo.value.id);
      if (articleInfo.value.likeCount !== undefined) articleInfo.value.likeCount--;
      isLiked.value = false;
    } else {
      await likeArticle(articleInfo.value.id);
      if (articleInfo.value.likeCount !== undefined) articleInfo.value.likeCount++;
      isLiked.value = true;
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
};

const toggleFavorite = async () => {
  if (!articleInfo.value) return;
  if (!isLoggedIn.value) {
    alert(t('articleDetail.loginToFavorite'));
    return;
  }
  try {
    if (isFavorited.value) {
      await unfavoriteArticle(articleInfo.value.id);
      if (articleInfo.value.favorites !== undefined) articleInfo.value.favorites--;
      isFavorited.value = false;
    } else {
      await favoriteArticle(articleInfo.value.id);
      if (articleInfo.value.favorites !== undefined) articleInfo.value.favorites++;
      isFavorited.value = true;
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
  }
};

const toggleShare = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    addToast(t('articleDetail.copied'), 'success');
  } catch (err) {
    console.error('Failed to copy:', err);
    addToast(t('articleDetail.copyFailed'), 'error');
  }
};

const handleEdit = () => {
  if (articleInfo.value) {
    router.push(`/editor?id=${articleInfo.value.id}`);
  }
};
</script>


<template>
  <div class="container article-layout" v-if="isLoading && !articleInfo">
    <div class="glass-panel article-skeleton">
      <div class="skeleton-header">
        <div class="skeleton-meta"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-user">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-info"></div>
        </div>
      </div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="width: 100%"></div>
        <div class="skeleton-line" style="width: 90%"></div>
        <div class="skeleton-line" style="width: 95%"></div>
        <div class="skeleton-line" style="width: 80%"></div>
        <div class="skeleton-line" style="width: 85%"></div>
      </div>
    </div>
  </div>
  <div class="container article-layout" v-else-if="!articleInfo && !isLoading">
    <div class="glass-panel" style="padding: 2rem; text-align: center;">
      {{ t('articleDetail.notFound') }}
    </div>
  </div>
  <div class="container article-layout" v-else>
    <main class="article-content">
      <article v-if="articleInfo" class="glass-panel article-main-card">
        <header class="article-header">
          <h1 class="article-title">{{ articleInfo.title }}</h1>
          <div class="article-meta">
            <span class="date">{{ formattedDate }}</span>
            <span class="dot" v-if="articleInfo.tags && articleInfo.tags.length > 0">•</span>
            <div class="tags" v-if="articleInfo.tags && articleInfo.tags.length > 0">
              <TagBadge v-for="tag in articleInfo.tags" :key="tag" :label="tag" size="sm" />
            </div>
          </div>
        </header>

        <div class="article-body">
          <MarkdownViewer v-if="articleContent" :content="articleContent" style="background: transparent;" />
          <div v-else-if="articleHtml" v-html="articleHtml"></div>
          <div class="skeleton-body" v-else-if="isLoading">
            <div class="skeleton-line" style="width: 100%"></div>
            <div class="skeleton-line" style="width: 90%"></div>
            <div class="skeleton-line" style="width: 95%"></div>
            <div class="skeleton-line" style="width: 80%"></div>
          </div>
          <div class="no-content" v-else>{{ t('articleDetail.noContent') }}</div>

          <div class="article-actions">
            <div class="author-info">
              <div class="avatar">
                <IconUser :size="20" :avatar="simpleAuthorProfile?.avatar" />
              </div>
              <span class="name">{{ simpleAuthorProfile?.name }}</span>
            </div>
            <div class="right-actions">
              <button v-if="isOwner" class="edit-btn" @click="handleEdit">
                {{ t('articleDetail.edit') }}
              </button>
              <button class="action-btn like-btn" :class="{ active: isLiked }" @click="toggleLike"
                aria-label="Like article">
                <IconLike :filled="isLiked" :size="18" />
                <span class="count">{{ articleInfo.likeCount || 0 }}</span>
              </button>
              <button class="action-btn fav-btn" :class="{ active: isFavorited }" @click="toggleFavorite"
                aria-label="Add to favorites">
                <IconStar :filled="isFavorited" :size="18" />
                <span class="count">{{ articleInfo.favorites || 0 }}</span>
              </button>
              <button class="action-btn share-btn" @click="toggleShare" aria-label="Share article">
                <IconShare :size="18" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <nav class="article-navigation glass-panel">
        <router-link v-if="prevArticle" :to="{ name: 'article-detail', params: { id: prevArticle.id } }"
          class="nav-link prev">
          <span class="nav-label">← {{ t('articleDetail.previous') }}</span>
          <span class="nav-title">{{ prevArticle.title }}</span>
        </router-link>
        <div v-else class="nav-spacer"></div>

        <div class="nav-divider"></div>

        <router-link v-if="nextArticle" :to="{ name: 'article-detail', params: { id: nextArticle.id } }"
          class="nav-link next">
          <span class="nav-label">{{ t('articleDetail.next') }} →</span>
          <span class="nav-title">{{ nextArticle.title }}</span>
        </router-link>
        <div v-else class="nav-spacer"></div>
      </nav>

    </main>
    <!-- Comments Section Moved Outside Main to allow Sidebar to stop scrolling with Article -->
    <section class="comments-section glass-panel">
      <h4>{{ t('articleDetail.comments') }} ({{ articleInfo?.commentCount ?? comments.length }})</h4>
      <div class="comment-form">
        <div class="avatar-wrapper">
          <div class="user-avatar">
            <img v-if="user && user.avatarUrl" :src="user.avatarUrl" :alt="user.username"
              style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />
            <IconUser v-else :size="24" />
          </div>
        </div>
        <div class="input-wrapper">
          <textarea v-model="newComment"
            :placeholder="isLoggedIn ? t('articleDetail.reply') + '...' : t('articleDetail.loginToComment')" rows="2"
            aria-label="Comment content" :disabled="!isLoggedIn"></textarea>
          <button @click="submitComment" class="submit-btn"
            :disabled="!newComment.trim() || !isLoggedIn || isSubmittingComment">
            <span v-if="isSubmittingComment">{{ t('editor.saving') }}</span>
            <span v-else>{{ t('articleDetail.submitComment') }}</span>
          </button>
        </div>
      </div>

      <div class="comments-list">
        <CommentItem v-for="comment in comments" :key="comment.id" :comment="comment"
          :loading-replies="loadingRepliesSet.has(comment.id)" @vote="handleVote" @reply="handleReply"
          @fetch-replies="handleFetchReplies" />
      </div>
    </section>
    <!-- <aside class="sidebar-section">
    <div class="sidebar-content">
      <UserCard v-if="authorInfo" :author="authorInfo" />
      <div class="sticky-wrapper">
        <ArticleToc 
          v-if="chapters.length > 0 || isLoadingChapters" 
          :chapters="chapters" 
          :is-loading="isLoadingChapters" 
          class="toc-card"
        />
        
        <TagsCard class="tags-card" />
        <SeriesCard class="series-card" />
        <RecommendedCard class="recommended-card" />
      </div>
    </div>
  </aside> -->
  </div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/markdown' as *;

.article-layout {
  display: grid;
  grid-template-columns: 1fr; // Reduced sidebar width slightly
  gap: 2rem; // Drastically reduced from 4rem to 2rem
  margin-top: 4rem;
  //padding-bottom: $spacing-md;
  max-width: 1000px;
  margin-left: auto;
  margin-right: auto;
  padding-left: $spacing-md;
  padding-right: $spacing-md;
  overflow-x: visible;

  @media (max-width: $breakpoint-desktop) {
    grid-template-columns: 1fr;
    gap: $spacing-lg;
    padding-left: $spacing-md;
    padding-right: $spacing-md;
  }

  @media (max-width: $breakpoint-tablet) {
    gap: $spacing-md;
  }

  @media (max-width: $breakpoint-mobile) {
    margin-top: 5rem;
    gap: $spacing-md;
    padding-bottom: $spacing-lg;
  }
}

.sidebar-section {
  min-width: 0; // Prevent grid overflow
  grid-column: 2;
  // grid-row: 1; // Removed to allow spanning
  grid-row: 1 / span 2; // Span across article and comments
  height: 100%;

  @media (max-width: $breakpoint-desktop) {
    // Mobile Adaptation: Show sidebar at bottom instead of hiding
    display: block;
    grid-column: 1;
    grid-row: auto;
    margin-top: 2rem;
    height: auto;
  }
}

.sidebar-content {
  height: 100%; // Pass height down
  display: flex;
  flex-direction: column;
}

.comments-section {
  grid-column: 1; // Align with article content
  grid-row: 2; // Place below article

  @media (max-width: $breakpoint-desktop) {
    grid-column: 1;
  }
}

.sticky-wrapper {
  position: sticky;
  top: 6rem; // Align with navbar height
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;

  @media (max-width: $breakpoint-desktop) {
    position: static; // Disable sticky on mobile
  }
}

.toc-card {
  flex-shrink: 0; // Prevent TOC from shrinking

  @media (max-width: $breakpoint-desktop) {
    display: none; // Hide TOC on mobile as it's at the bottom
  }
}

.tags-card,
.series-card,
.recommended-card {
  flex-shrink: 0;
}

.article-content {
  min-width: 0;
  /* Allow grid item to shrink below content size */
}

.article-body {
  content-visibility: auto;
  /* Browser optimization: skip rendering off-screen content */
  contain-intrinsic-size: 1000px;
  /* Placeholder size for scrollbar stability */
  // contain: layout paint; // REMOVED: Can cause issues with sticky elements or overlays
}

/* Optimize images within markdown preview - handled by markdown mixin now */
/* Removed duplicated image styles */

.glass-panel {
  // Performance Optimization: 
  // Replaced heavy backdrop-filter with a solid semi-transparent background
  // This maintains the visual hierarchy without the GPU cost of real-time blurring
  background: $color-bg-secondary;
  border: 1px solid $color-border;
  border-radius: 16px;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02); // Subtle shadow for depth

  @media (max-width: $breakpoint-mobile) {
  
    border-radius: 12px;
  }
}

.glass-panel.blur-effect {
  // Only use this for small, sticky elements if absolutely necessary
  background: rgba(255, 255, 255, 0.95); // Increased opacity to remove need for blur
  // backdrop-filter: saturate(180%) blur(12px); // REMOVED: Expensive operation
  // -webkit-backdrop-filter: saturate(180%) blur(12px); // REMOVED
  border: 1px solid $color-border;

  @media (prefers-color-scheme: dark) {
    background: rgba(30, 30, 30, 0.95); // High opacity dark background
  }
}

.glass-panel.no-backdrop {
  background: $color-bg-secondary;
}

.article-main-card {
  display: flex;
  flex-direction: column;
  border-bottom: none;
  margin-bottom: 0;
}

.article-header {

  @media (max-width: $breakpoint-mobile) {
    margin-bottom: $spacing-lg;
  }

  .article-meta {
    display: flex;
    gap: $spacing-md;
    color: $color-text-secondary;
    font-size: 0.8rem;
    flex-wrap: wrap;

    .tag {
      color: $color-accent-primary;
    }
  }

  .article-title {
    font-size: 2.5rem;
    margin-bottom: $spacing-xs;
    line-height: 1.2;
    word-break: break-word; // Prevent long words from overflowing
    color: $color-text-primary;

    @media (max-width: $breakpoint-mobile) {
      font-size: 1.75rem;
      line-height: 1.3;
      margin-bottom: $spacing-md;
    }
  }
}

.author-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-shrink: 0;

  .avatar {
    width: 2rem;
    height: 2rem;
    background: $color-bg-secondary;
    border-radius: 50%;
    display: flex;
    align-items: center;
  }

  .name {
    font-weight: 600;
    font-size: 0.9rem;
    color: $color-text-primary;
    white-space: nowrap;
  }
}

.right-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-shrink: 0;

  .edit-btn {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    border: 1px solid rgba($color-border, 0.5);
    background: rgba($color-bg-secondary, 0.5);
    color: $color-text-secondary;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    &:hover {
      border-color: $color-accent-primary;
      color: $color-accent-primary;
      background: rgba($color-accent-primary, 0.1);
    }
  }
}

.article-body {
  @include markdown-styles; // Use shared markdown styles
  min-height: 200px; // Prevent collapse when empty
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading-placeholder {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
  font-style: italic;
}

.article-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  padding-top: $spacing-lg;
  padding-bottom: $spacing-sm;
  contain: layout;
  margin-top: auto;

  .right-actions {
    display: flex;
    gap: $spacing-sm;
  }

  .action-btn {
    background: transparent;
    border: none;
    color: $color-text-secondary;
    padding: 0.3rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 32px;
    min-width: 32px;
    font-family: inherit;

    .count {
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      min-width: 1ch;
    }

    &:hover {
      color: $color-text-primary;
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }

    &.like-btn {
      &:hover {
        color: #ff4757;
        background: transparent;
      }

      &.active {
        color: #ff4757;
        background: transparent;

        .count {
          color: #ff4757;
        }
      }
    }

    &.fav-btn {
      &:hover {
        color: #ffa502;
        background: transparent;
      }

      &.active {
        color: #ffa502;
        background: transparent;

        .count {
          color: #ffa502;
        }
      }
    }

    &.share-btn {
      margin-left: auto;

      &:hover {
        color: $color-accent-primary;
        background: transparent;
      }
    }
  }
}

.article-navigation {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
  margin-bottom: $spacing-lg;
  border-bottom: none;

  @media (max-width: $breakpoint-mobile) {
    flex-direction: column;
    gap: $spacing-md;
  }

  .nav-link {
    flex: 1;
    padding: $spacing-lg;
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    text-decoration: none;
    color: $color-text-primary;
    transition: background 0.3s;
    min-height: 5rem; // Larger touch area

    @media (max-width: $breakpoint-mobile) {
      padding: $spacing-md;
      background: $color-bg-secondary; // Distinct background on mobile
      border-radius: $radius-md;
    }

    &:hover {
      background: $color-bg-secondary;

      .nav-title {
        color: $color-accent-primary;
      }
    }

    &.prev {
      text-align: start;
      align-items: flex-start;
    }

    &.next {
      text-align: end;
      align-items: flex-end;

      @media (max-width: $breakpoint-mobile) {
        text-align: start;
        align-items: flex-start;
      }
    }

    .nav-label {
      font-size: 0.85rem;
      color: $color-text-secondary;
    }

    .nav-title {
      font-weight: bold;
      font-size: 1.1rem;
      transition: color 0.3s;
    }
  }

  .nav-divider {
    width: 1px;
    background: $color-border;

    @media (max-width: $breakpoint-mobile) {
      display: none;
    }
  }

  .nav-spacer {
    flex: 1;
  }
}

.comments-section {
  h3 {
    margin-bottom: $spacing-lg;
    font-size: 1.5rem;
    color: $color-text-primary;

    @media (max-width: $breakpoint-mobile) {
      font-size: 1.3rem;
    }
  }

  .comment-form {
    margin-bottom: $spacing-md;
    display: flex;
    gap: $spacing-sm;
    align-items: center;

    @media (max-width: $breakpoint-mobile) {
      flex-direction: column;
    }

    .avatar-wrapper {
      flex-shrink: 0;

      .user-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: $color-bg-primary;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid $color-border;
      }
    }

    .input-wrapper {
      flex-grow: 1;
      display: flex;
      gap: $spacing-sm;
      align-items: center;

      @media (max-width: $breakpoint-mobile) {
        flex-direction: column;
      }
    }

    textarea {
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      color: $color-text-primary;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      height: 2.5rem;
      overflow: hidden;
      resize: none;
      white-space: nowrap;

      :global(.dark) & {
        background: rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.05);
      }

      &:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(var(--color-accent-primary-rgb), 0.3);
        height: auto;
        min-height: 4rem;
        overflow: auto;
        resize: vertical;
        white-space: normal;
      }
    }

    .submit-btn {
      flex-shrink: 0;
      background: #00a1d6;
      color: #fff;
      border: none;
      padding: 0.5rem 1.2rem;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      font-family: $font-family-code;
      min-height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #ccc;
      }

      &:not(:disabled):hover {
        background: #00b5e5;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 161, 214, 0.4);
      }

      &:not(:disabled):active {
        transform: translateY(0);
        background: #0093c4;
      }

      @media (max-width: $breakpoint-mobile) {
        width: 100%;
      }
    }
  }
}

.sidebar-section {
  @media (max-width: $breakpoint-desktop) {
    margin-top: $spacing-lg;
  }
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

// Skeleton Loader Styles
.article-skeleton {
  padding: 2rem;
  width: 100%;
}

.skeleton-header {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.skeleton-meta {
  width: 200px;
  height: 14px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.skeleton-title {
  width: 60%;
  height: 40px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin: 1rem 0;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.08);
  }
}

.skeleton-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.skeleton-info {
  width: 120px;
  height: 14px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.skeleton-line {
  height: 16px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.05);
  }
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}
</style>

<style lang="scss">
/* Nuclear Option: Force Dark Mode Styles for Article Detail Page Components */
/* User requested "100% successful solution" to fix black background issues */
html.dark .article-layout {

  .glass-panel,
  .article-main-card,
  .comments-section,
  .user-card,
  .toc-card,
  .tags-card,
  .series-card,
  .recommended-card {
    /* Performance Optimization: Removed backdrop-filter blur which causes severe scroll lag */
    /* Increased opacity to maintain contrast and "dark gray" look without GPU penalty */
    background-color: rgba(30, 30, 31, 0.95) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.4) !important;
    color: #ffffff !important;

    /* Hardware acceleration hint */
    transform: translateZ(0);
  }

  /* Ensure text colors inside these cards are visible */
  .card-title,
  .username,
  .article-title {
    color: #ffffff !important;
  }

  .card-header {
    background: transparent !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  }
}
</style>

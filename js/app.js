// ===== Supabase初期化 =====
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 状態管理 =====
let currentFilter = 'すべて';
let currentPostId  = null;
let allPosts       = [];

// ===== 起動 =====
window.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  subscribeRealtime();
});

// ===== 投稿を読み込む =====
async function loadPosts() {
  showLoading(true);
  const { data, error } = await db
    .from('posts')
    .select('*, comments(count)')
    .order('created_at', { ascending: false });

  showLoading(false);

  if (error) { console.error(error); return; }
  allPosts = data || [];
  updateStats();
  renderPosts();
}

// ===== リアルタイム購読（新着が自動表示） =====
function subscribeRealtime() {
  db.channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
      allPosts.unshift({ ...payload.new, comments: [{ count: 0 }] });
      updateStats();
      renderPosts();
    })
    .subscribe();
}

// ===== 投稿する =====
async function submitPost() {
  const name   = document.getElementById('input-name').value.trim() || '匿名';
  const cat    = document.getElementById('input-category').value;
  const body   = document.getElementById('input-body').value.trim();
  if (!body) { showToast('トレーニング内容を入力してください'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = '投稿中...';

  const { error } = await db.from('posts').insert({ name, category: cat, body });

  btn.disabled = false;
  btn.querySelector('.btn-text').textContent = '投稿する';

  if (error) { showToast('エラーが発生しました'); console.error(error); return; }

  document.getElementById('input-body').value = '';
  showToast('投稿しました 💪');
}

// ===== 応援する =====
async function toggleCheer(postId, currentCheers, btn) {
  const isCheered = btn.classList.contains('cheered');
  const newCheers = isCheered ? currentCheers - 1 : currentCheers + 1;

  btn.classList.toggle('cheered');
  btn.dataset.cheers = newCheers;
  btn.innerHTML = `${isCheered ? '👊' : '🔥'} ${isCheered ? '応援する' : '応援中'} ${newCheers > 0 ? newCheers : ''}`;

  const { error } = await db
    .from('posts')
    .update({ cheers: newCheers })
    .eq('id', postId);

  if (error) {
    btn.classList.toggle('cheered');
    console.error(error);
  }
  const post = allPosts.find(p => p.id === postId);
  if (post) post.cheers = newCheers;
}

// ===== コメントモーダルを開く =====
async function openCommentModal(postId) {
  currentPostId = postId;
  document.getElementById('comment-modal').style.display = 'flex';
  document.getElementById('modal-comment-text').value = '';
  await loadComments(postId);
}

function closeCommentModal(e) {
  if (e && e.target !== document.getElementById('comment-modal')) return;
  document.getElementById('comment-modal').style.display = 'none';
  currentPostId = null;
}

// ===== コメント一覧を読み込む =====
async function loadComments(postId) {
  const list = document.getElementById('modal-comments-list');
  list.innerHTML = '<p class="no-comments">読み込み中...</p>';

  const { data, error } = await db
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) { list.innerHTML = '<p class="no-comments">エラーが発生しました</p>'; return; }
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="no-comments">まだコメントはありません</p>';
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="comment-item">
      <div class="comment-avatar">${getInitials(c.name)}</div>
      <div class="comment-bubble">
        <div class="comment-name">${esc(c.name)}</div>
        <div class="comment-text">${esc(c.body)}</div>
      </div>
    </div>
  `).join('');
  list.scrollTop = list.scrollHeight;
}

// ===== コメントを送信する =====
async function sendComment() {
  if (!currentPostId) return;
  const name = document.getElementById('modal-comment-name').value.trim() || '匿名';
  const body = document.getElementById('modal-comment-text').value.trim();
  if (!body) { showToast('コメントを入力してください'); return; }

  const btn = document.querySelector('.modal-send-btn');
  btn.disabled = true;
  btn.textContent = '送信中...';

  const { error } = await db.from('comments').insert({ post_id: currentPostId, name, body });

  btn.disabled = false;
  btn.textContent = '送信';

  if (error) { showToast('エラーが発生しました'); console.error(error); return; }

  document.getElementById('modal-comment-text').value = '';
  await loadComments(currentPostId);

  // コメント数を更新
  const post = allPosts.find(p => p.id === currentPostId);
  if (post && post.comments && post.comments[0]) {
    post.comments[0].count++;
    renderPosts();
  }
}

// ===== フィルター =====
function filterPosts(cat, tabEl) {
  currentFilter = cat;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  renderPosts();
}

// ===== 描画 =====
function renderPosts() {
  const list = document.getElementById('feed-list');
  const empty = document.getElementById('empty-state');

  const filtered = currentFilter === 'すべて'
    ? allPosts
    : allPosts.filter(p => p.category === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = filtered.map(post => {
    const cheers   = post.cheers || 0;
    const comments = post.comments?.[0]?.count ?? 0;
    return `
      <div class="post-card">
        <div class="post-top">
          <div class="avatar">${getInitials(post.name)}</div>
          <div class="post-meta">
            <div class="post-name">${esc(post.name)}</div>
            <div class="post-time">${timeAgo(post.created_at)}</div>
          </div>
          <span class="cat-badge cat-${esc(post.category)}">${esc(post.category)}</span>
        </div>
        <div class="post-body">${esc(post.body)}</div>
        <div class="post-actions">
          <button
            class="action-btn cheer-btn ${cheers > 0 ? '' : ''}"
            data-cheers="${cheers}"
            onclick="toggleCheer('${post.id}', ${cheers}, this)"
          >
            👊 応援する ${cheers > 0 ? cheers : ''}
          </button>
          <button class="action-btn" onclick="openCommentModal('${post.id}')">
            💬 コメント ${comments > 0 ? comments : ''}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== ヘルパー =====
function updateStats() {
  document.getElementById('total-posts').textContent = allPosts.length;
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function getInitials(name) {
  if (!name || name === '匿名') return '?';
  return name.slice(0, 2);
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

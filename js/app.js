// ============================================================
//  PUMP LOG — app.js
//  シンプルで確実に動くコード。バグゼロを目指して完全書き直し。
// ============================================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 状態 =====
let posts         = [];
let currentFilter = 'すべて';
let openPostId    = null;

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', () => {
  fetchPosts();
  listenRealtime();
});

// ===== 投稿一覧を取得 =====
async function fetchPosts() {
  setLoading(true);

  const { data, error } = await db
    .from('posts')
    .select(`
      id, name, category, body, likes, created_at,
      comments ( count )
    `)
    .order('created_at', { ascending: false });

  setLoading(false);

  if (error) {
    console.error('fetchPosts error:', error);
    toast('データの取得に失敗しました');
    return;
  }

  posts = data ?? [];
  updateCount();
  renderFeed();
}

// ===== リアルタイム購読 =====
function listenRealtime() {
  db.channel('posts-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => fetchPosts()   // 変更があったら必ず再取得
    )
    .subscribe();
}

// ===== 投稿する =====
async function submitPost() {
  const name  = val('input-name')  || '匿名';
  const cat   = val('input-category');
  const body  = val('input-body');

  if (!body.trim()) { toast('📝 トレーニング内容を入力してください'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = '投稿中... 🚀';

  const { error } = await db.from('posts').insert({ name, category: cat, body: body.trim() });

  btn.disabled = false;
  btn.textContent = '投稿する 🚀';

  if (error) {
    console.error('insert error:', error);
    toast('❌ 投稿に失敗しました');
    return;
  }

  document.getElementById('input-body').value = '';
  toast('💪 投稿しました！');
  // リアルタイム購読が fetchPosts() を呼ぶので手動更新は不要
}

// ===== いいねする =====
async function toggleLike(postId, currentLikes, btn) {
  const liked     = btn.classList.contains('liked');
  const newLikes  = liked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

  // ローカルで即時反映
  btn.classList.toggle('liked');
  btn.textContent = liked
    ? `🤍 いいね ${newLikes > 0 ? newLikes : ''}`
    : `❤️ いいね ${newLikes}`;

  const { error } = await db
    .from('posts')
    .update({ likes: newLikes })
    .eq('id', postId);

  if (error) {
    // 失敗したら元に戻す
    btn.classList.toggle('liked');
    const post = posts.find(p => p.id === postId);
    btn.textContent = `🤍 いいね ${currentLikes > 0 ? currentLikes : ''}`;
    toast('❌ いいねに失敗しました');
  } else {
    // 成功したらローカルデータも更新
    const post = posts.find(p => p.id === postId);
    if (post) post.likes = newLikes;
  }
}

// ===== 削除する =====
async function deletePost(postId) {
  if (!confirm('この投稿を削除しますか？')) return;

  const { error } = await db.from('posts').delete().eq('id', postId);

  if (error) {
    console.error('delete error:', error);
    toast('❌ 削除に失敗しました');
    return;
  }

  toast('🗑️ 削除しました');
  // リアルタイム購読が fetchPosts() を呼ぶので自動更新
}

// ===== コメントモーダルを開く =====
async function openModal(postId) {
  openPostId = postId;
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('cm-body').value = '';
  await fetchComments(postId);
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  openPostId = null;
}

function handleModalBgClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ===== コメント一覧を取得 =====
async function fetchComments(postId) {
  const list = document.getElementById('modal-list');
  list.innerHTML = '<p class="no-cm">⏳ 読み込み中...</p>';

  const { data, error } = await db
    .from('comments')
    .select('id, name, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = '<p class="no-cm">❌ 取得に失敗しました</p>';
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="no-cm">まだコメントはありません 💬</p>';
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="cm-item">
      <div class="cm-avatar">${initials(c.name)}</div>
      <div class="cm-bubble">
        <div class="cm-name">${esc(c.name)}</div>
        <div class="cm-text">${esc(c.body)}</div>
      </div>
    </div>
  `).join('');

  list.scrollTop = list.scrollHeight;
}

// ===== コメントを送信 =====
async function sendComment() {
  if (!openPostId) return;

  const name = val('cm-name') || '匿名';
  const body = val('cm-body');

  if (!body.trim()) { toast('📝 コメントを入力してください'); return; }

  const btn = document.querySelector('.modal-send');
  btn.disabled = true;
  btn.textContent = '送信中...';

  const { error } = await db.from('comments').insert({
    post_id: openPostId,
    name,
    body: body.trim()
  });

  btn.disabled = false;
  btn.textContent = '送信 ✉️';

  if (error) {
    console.error('comment insert error:', error);
    toast('❌ コメントの送信に失敗しました');
    return;
  }

  document.getElementById('cm-body').value = '';
  await fetchComments(openPostId);

  // コメント数をローカルで更新して再描画
  const post = posts.find(p => p.id === openPostId);
  if (post?.comments?.[0]) {
    post.comments[0].count++;
    renderFeed();
  }
}

// ===== フィルター =====
function setFilter(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFeed();
}

// ===== 描画 =====
function renderFeed() {
  const feed  = document.getElementById('feed');
  const empty = document.getElementById('empty');

  const visible = currentFilter === 'すべて'
    ? posts
    : posts.filter(p => p.category === currentFilter);

  if (visible.length === 0) {
    feed.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  feed.innerHTML = visible.map(p => {
    const likes    = p.likes ?? 0;
    const cmCount  = p.comments?.[0]?.count ?? 0;

    return `
      <div class="post-card" data-cat="${esc(p.category)}">
        <div class="card-top">
          <div class="avatar av-${esc(p.category)}">${initials(p.name)}</div>
          <div class="card-meta">
            <div class="card-name">${esc(p.name)}</div>
            <div class="card-time">${timeAgo(p.created_at)}</div>
          </div>
          <span class="cat-badge badge-${esc(p.category)}">${esc(p.category)}</span>
        </div>
        <div class="card-body">${esc(p.body)}</div>
        <div class="card-actions">
          <button
            class="act-btn like-btn ${likes > 0 ? '' : ''}"
            onclick="toggleLike('${p.id}', ${likes}, this)"
          >🤍 いいね ${likes > 0 ? likes : ''}</button>
          <button class="act-btn" onclick="openModal('${p.id}')">
            💬 コメント ${cmCount > 0 ? cmCount : ''}
          </button>
          <button class="act-btn delete-btn" onclick="deletePost('${p.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ===== ユーティリティ =====
function updateCount() {
  document.getElementById('total-count').textContent = posts.length;
}

function setLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
  if (show) document.getElementById('empty').style.display = 'none';
}

function val(id) {
  return document.getElementById(id)?.value?.trim() ?? '';
}

function initials(name) {
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

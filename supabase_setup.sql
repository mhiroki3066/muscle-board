-- =============================================
--  Supabase SQL Editor にこれをそのまま貼って実行
-- =============================================

-- 投稿テーブル
create table posts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '匿名',
  category   text not null default 'その他',
  body       text not null,
  cheers     integer not null default 0,
  created_at timestamptz not null default now()
);

-- コメントテーブル
create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  name       text not null default '匿名',
  body       text not null,
  created_at timestamptz not null default now()
);

-- 誰でも読み書きできるようにする（匿名掲示板なので）
alter table posts   enable row level security;
alter table comments enable row level security;

create policy "誰でも投稿を読める"  on posts    for select using (true);
create policy "誰でも投稿を作れる"  on posts    for insert with check (true);
create policy "誰でも投稿を更新できる" on posts  for update using (true);

create policy "誰でもコメントを読める" on comments for select using (true);
create policy "誰でもコメントを作れる" on comments for insert with check (true);

-- リアルタイム通知を有効化
alter publication supabase_realtime add table posts;

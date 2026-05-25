-- =============================================
--  PUMP LOG — Supabase SQL Editor に貼って実行
--  ※ 前のテーブルが残っている場合は先に削除してから実行
-- =============================================

-- 古いテーブルを削除（前のバージョンから移行する場合）
drop table if exists comments;
drop table if exists posts;

-- 投稿テーブル
create table posts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '匿名',
  category   text not null default 'その他',
  body       text not null,
  likes      integer not null default 0,
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

-- セキュリティポリシー（誰でも読み書きOK）
alter table posts    enable row level security;
alter table comments enable row level security;

create policy "posts_select"  on posts    for select using (true);
create policy "posts_insert"  on posts    for insert with check (true);
create policy "posts_update"  on posts    for update using (true);
create policy "posts_delete"  on posts    for delete using (true);

create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (true);

-- リアルタイム有効化
alter publication supabase_realtime add table posts;

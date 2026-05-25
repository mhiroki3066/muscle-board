# 筋トレ掲示板 — 公開手順

## ファイル構成
```
muscle-board/
├── index.html          ← メインページ
├── css/style.css       ← デザイン
├── js/config.js        ← Supabase接続情報（自分で書き換える）
├── js/app.js           ← 機能すべて
└── supabase_setup.sql  ← データベース設定
```

---

## Step 1 — GitHubアカウントを作る（無料）

1. https://github.com を開く
2. 「Sign up」→ メールアドレス・パスワードを設定
3. メール認証を完了する

---

## Step 2 — Supabaseアカウントを作る（無料）

1. https://supabase.com を開く
2. 「Start your project」→ GitHubアカウントでログイン
3. 「New project」をクリック
4. プロジェクト名を入力（例: muscle-board）
5. パスワードを設定してプロジェクト作成（1〜2分待つ）

### データベースを設定する
6. 左メニュー「SQL Editor」をクリック
7. `supabase_setup.sql` の内容を全部コピーして貼り付ける
8. 「RUN」ボタンをクリック → 「Success」と表示されればOK

### 接続情報をコピーする
9. 左メニュー「Settings」→「API」をクリック
10. 「Project URL」をコピー → `js/config.js` の `'ここにProject URLを貼る'` と差し替える
11. 「anon public」のキーをコピー → `'ここにanon public keyを貼る'` と差し替える

---

## Step 3 — GitHubにコードをアップロードする

1. https://github.com/new でリポジトリ（保管場所）を作る
   - Repository name: `muscle-board`
   - Public を選択
   - 「Create repository」をクリック

2. 「uploading an existing file」をクリック

3. フォルダをそのままドラッグ＆ドロップでアップロード

4. 「Commit changes」をクリック

---

## Step 4 — Vercelで公開する（無料）

1. https://vercel.com を開く
2. 「Sign Up」→ GitHubアカウントでログイン
3. 「Add New Project」→ さきほどのリポジトリ（muscle-board）を選ぶ
4. 何も変更せず「Deploy」をクリック
5. 1〜2分で `your-project.vercel.app` というURLが発行される！

---

## 完成！

友達にURLをシェアすれば、みんなで使える筋トレ掲示板の完成です 💪

### 使える機能
- トレーニング内容の投稿（ニックネーム + カテゴリ + 内容）
- カテゴリフィルター（胸・背中・脚・肩・腕・全身・有酸素）
- 応援ボタン（リアクション数カウント）
- コメント返信
- リアルタイム更新（誰かが投稿すると即座に表示）

### 困ったときは
Claudeに「〇〇のところがうまくいかない」と相談してください！

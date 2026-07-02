# TABI 管理者画面 作成手順 / Admin画面構成メモ

このドキュメントは、TABIアプリの**運営者が使う管理者画面**を作成するためのフォルダー構成、作成コマンド、各ファイルの役割、Claude Codeへ依頼する内容をまとめたものです。

対象は、コテージ運営者ではなく、**TABIアプリ全体を管理する運営者**です。

---

## 1. 管理者画面の目的

TABIアプリの運営者が、アプリ全体の状況を確認し、ユーザー・旅行グループ・投稿・通報・問い合わせ・お知らせ・スポット情報・管理者権限・操作ログなどを管理するための画面を作成します。

管理対象は主に以下です。

- ユーザー
- 旅行グループ
- 話し合い・投稿
- 通報
- お問い合わせ
- お知らせ
- スポット情報
- 分析・利用状況
- 管理者・権限
- 操作ログ

---

## 2. 作成前の注意

Git Bashでは、必ずプロジェクトのルートディレクトリで実行してください。

今回のプロジェクトでは、以下のように `package.json` や `src` がある階層です。

```txt
TABI
├─ package.json
├─ src
├─ public
├─ api
├─ README.md
└─ TABI-Admin.md
```

確認コマンドです。

```bash
pwd
ls
```

`package.json` と `src` が表示される場所で実行してください。

---

## 3. Git Bashでフォルダーを作成するコマンド

以下をそのままGit Bashに貼り付けて実行してください。

```bash
mkdir -p \
  src/assets/admin/icons \
  src/assets/admin/images \
  src/components/Admin/layout \
  src/components/Admin/common \
  src/components/Admin/dashboard \
  src/components/Admin/users \
  src/components/Admin/groups \
  src/components/Admin/support \
  src/components/Admin/notices \
  src/components/Admin/spots \
  src/components/Admin/logs \
  src/pages/Admin/Dashboard \
  src/pages/Admin/Users \
  src/pages/Admin/Groups \
  src/pages/Admin/Posts \
  src/pages/Admin/Reports \
  src/pages/Admin/Inquiries \
  src/pages/Admin/Notices \
  src/pages/Admin/Spots \
  src/pages/Admin/Analytics \
  src/pages/Admin/Managers \
  src/pages/Admin/Logs \
  src/services/admin \
  src/data/admin
```

---

## 4. Git Bashでファイルを作成するコマンド

以下をそのままGit Bashに貼り付けて実行してください。

`touch` は既存ファイルの中身を消さないため、安全に空ファイルを作成できます。

```bash
touch \
  src/components/Admin/layout/AdminLayout.jsx \
  src/components/Admin/layout/AdminHeader.jsx \
  src/components/Admin/layout/AdminBottomNav.jsx \
  src/components/Admin/layout/AdminSideNav.jsx \
  src/components/Admin/layout/AdminLayout.module.css \
  src/components/Admin/layout/AdminHeader.module.css \
  src/components/Admin/layout/AdminBottomNav.module.css \
  src/components/Admin/layout/AdminSideNav.module.css \
  src/components/Admin/common/AdminCard.jsx \
  src/components/Admin/common/AdminCard.module.css \
  src/components/Admin/common/AdminStatCard.jsx \
  src/components/Admin/common/AdminStatCard.module.css \
  src/components/Admin/common/AdminSearchBar.jsx \
  src/components/Admin/common/AdminSearchBar.module.css \
  src/components/Admin/common/AdminTabs.jsx \
  src/components/Admin/common/AdminTabs.module.css \
  src/components/Admin/common/AdminStatusBadge.jsx \
  src/components/Admin/common/AdminStatusBadge.module.css \
  src/components/Admin/common/AdminPagination.jsx \
  src/components/Admin/common/AdminPagination.module.css \
  src/components/Admin/common/AdminEmptyState.jsx \
  src/components/Admin/common/AdminEmptyState.module.css \
  src/components/Admin/dashboard/SummaryCard.jsx \
  src/components/Admin/dashboard/SummaryCard.module.css \
  src/components/Admin/dashboard/ActivityList.jsx \
  src/components/Admin/dashboard/ActivityList.module.css \
  src/components/Admin/dashboard/UserChartCard.jsx \
  src/components/Admin/dashboard/UserChartCard.module.css \
  src/components/Admin/users/UserListItem.jsx \
  src/components/Admin/users/UserListItem.module.css \
  src/components/Admin/users/UserProfileCard.jsx \
  src/components/Admin/users/UserProfileCard.module.css \
  src/components/Admin/users/UserActionButtons.jsx \
  src/components/Admin/users/UserActionButtons.module.css \
  src/components/Admin/groups/GroupListItem.jsx \
  src/components/Admin/groups/GroupListItem.module.css \
  src/components/Admin/groups/GroupSummaryCard.jsx \
  src/components/Admin/groups/GroupSummaryCard.module.css \
  src/components/Admin/groups/GroupMemberList.jsx \
  src/components/Admin/groups/GroupMemberList.module.css \
  src/components/Admin/support/InquiryListItem.jsx \
  src/components/Admin/support/InquiryListItem.module.css \
  src/components/Admin/support/ReportListItem.jsx \
  src/components/Admin/support/ReportListItem.module.css \
  src/components/Admin/support/PostListItem.jsx \
  src/components/Admin/support/PostListItem.module.css \
  src/components/Admin/support/AdminMemoBox.jsx \
  src/components/Admin/support/AdminMemoBox.module.css \
  src/components/Admin/notices/NoticeListItem.jsx \
  src/components/Admin/notices/NoticeListItem.module.css \
  src/components/Admin/notices/NoticeForm.jsx \
  src/components/Admin/notices/NoticeForm.module.css \
  src/components/Admin/spots/SpotListItem.jsx \
  src/components/Admin/spots/SpotListItem.module.css \
  src/components/Admin/spots/SpotForm.jsx \
  src/components/Admin/spots/SpotForm.module.css \
  src/components/Admin/logs/LogListItem.jsx \
  src/components/Admin/logs/LogListItem.module.css
```

---

## 5. Git Bashでページファイルを作成するコマンド

```bash
touch \
  src/pages/Admin/AdminRoutes.jsx \
  src/pages/Admin/Dashboard/AdminDashboard.jsx \
  src/pages/Admin/Dashboard/AdminDashboard.module.css \
  src/pages/Admin/Users/AdminUserList.jsx \
  src/pages/Admin/Users/AdminUserDetail.jsx \
  src/pages/Admin/Users/AdminUsers.module.css \
  src/pages/Admin/Groups/AdminGroupList.jsx \
  src/pages/Admin/Groups/AdminGroupDetail.jsx \
  src/pages/Admin/Groups/AdminGroups.module.css \
  src/pages/Admin/Posts/AdminPostList.jsx \
  src/pages/Admin/Posts/AdminPostDetail.jsx \
  src/pages/Admin/Posts/AdminPosts.module.css \
  src/pages/Admin/Reports/AdminReportList.jsx \
  src/pages/Admin/Reports/AdminReportDetail.jsx \
  src/pages/Admin/Reports/AdminReports.module.css \
  src/pages/Admin/Inquiries/AdminInquiryList.jsx \
  src/pages/Admin/Inquiries/AdminInquiryDetail.jsx \
  src/pages/Admin/Inquiries/AdminInquiries.module.css \
  src/pages/Admin/Notices/AdminNoticeList.jsx \
  src/pages/Admin/Notices/AdminNoticeForm.jsx \
  src/pages/Admin/Notices/AdminNotices.module.css \
  src/pages/Admin/Spots/AdminSpotList.jsx \
  src/pages/Admin/Spots/AdminSpotForm.jsx \
  src/pages/Admin/Spots/AdminSpots.module.css \
  src/pages/Admin/Analytics/AdminAnalytics.jsx \
  src/pages/Admin/Analytics/AdminAnalytics.module.css \
  src/pages/Admin/Managers/AdminManagerList.jsx \
  src/pages/Admin/Managers/AdminManagers.module.css \
  src/pages/Admin/Logs/AdminLogList.jsx \
  src/pages/Admin/Logs/AdminLogs.module.css
```

---

## 6. Git BashでAPI通信ファイルとモックデータを作成するコマンド

```bash
touch \
  src/services/admin/adminDashboardService.js \
  src/services/admin/adminUserService.js \
  src/services/admin/adminGroupService.js \
  src/services/admin/adminPostService.js \
  src/services/admin/adminReportService.js \
  src/services/admin/adminInquiryService.js \
  src/services/admin/adminNoticeService.js \
  src/services/admin/adminSpotService.js \
  src/services/admin/adminAnalyticsService.js \
  src/services/admin/adminManagerService.js \
  src/services/admin/adminLogService.js \
  src/data/admin/mockAdminDashboard.js \
  src/data/admin/mockAdminUsers.js \
  src/data/admin/mockAdminGroups.js \
  src/data/admin/mockAdminPosts.js \
  src/data/admin/mockAdminReports.js \
  src/data/admin/mockAdminInquiries.js \
  src/data/admin/mockAdminNotices.js \
  src/data/admin/mockAdminSpots.js \
  src/data/admin/mockAdminAnalytics.js \
  src/data/admin/mockAdminManagers.js \
  src/data/admin/mockAdminLogs.js
```

---

## 7. 作成後に確認するコマンド

```bash
find src/pages/Admin -maxdepth 3 -type f | sort
find src/components/Admin -maxdepth 3 -type f | sort
find src/services/admin -maxdepth 1 -type f | sort
find src/data/admin -maxdepth 1 -type f | sort
```

---

## 8. 完成後のフォルダー構成

```txt
src
├─ assets
│  └─ admin
│     ├─ icons
│     └─ images
│
├─ components
│  └─ Admin
│     ├─ layout
│     │  ├─ AdminLayout.jsx
│     │  ├─ AdminLayout.module.css
│     │  ├─ AdminHeader.jsx
│     │  ├─ AdminHeader.module.css
│     │  ├─ AdminBottomNav.jsx
│     │  ├─ AdminBottomNav.module.css
│     │  ├─ AdminSideNav.jsx
│     │  └─ AdminSideNav.module.css
│     │
│     ├─ common
│     │  ├─ AdminCard.jsx
│     │  ├─ AdminCard.module.css
│     │  ├─ AdminStatCard.jsx
│     │  ├─ AdminStatCard.module.css
│     │  ├─ AdminSearchBar.jsx
│     │  ├─ AdminSearchBar.module.css
│     │  ├─ AdminTabs.jsx
│     │  ├─ AdminTabs.module.css
│     │  ├─ AdminStatusBadge.jsx
│     │  ├─ AdminStatusBadge.module.css
│     │  ├─ AdminPagination.jsx
│     │  ├─ AdminPagination.module.css
│     │  ├─ AdminEmptyState.jsx
│     │  └─ AdminEmptyState.module.css
│     │
│     ├─ dashboard
│     │  ├─ SummaryCard.jsx
│     │  ├─ SummaryCard.module.css
│     │  ├─ ActivityList.jsx
│     │  ├─ ActivityList.module.css
│     │  ├─ UserChartCard.jsx
│     │  └─ UserChartCard.module.css
│     │
│     ├─ users
│     │  ├─ UserListItem.jsx
│     │  ├─ UserListItem.module.css
│     │  ├─ UserProfileCard.jsx
│     │  ├─ UserProfileCard.module.css
│     │  ├─ UserActionButtons.jsx
│     │  └─ UserActionButtons.module.css
│     │
│     ├─ groups
│     │  ├─ GroupListItem.jsx
│     │  ├─ GroupListItem.module.css
│     │  ├─ GroupSummaryCard.jsx
│     │  ├─ GroupSummaryCard.module.css
│     │  ├─ GroupMemberList.jsx
│     │  └─ GroupMemberList.module.css
│     │
│     ├─ support
│     │  ├─ InquiryListItem.jsx
│     │  ├─ InquiryListItem.module.css
│     │  ├─ ReportListItem.jsx
│     │  ├─ ReportListItem.module.css
│     │  ├─ PostListItem.jsx
│     │  ├─ PostListItem.module.css
│     │  ├─ AdminMemoBox.jsx
│     │  └─ AdminMemoBox.module.css
│     │
│     ├─ notices
│     │  ├─ NoticeListItem.jsx
│     │  ├─ NoticeListItem.module.css
│     │  ├─ NoticeForm.jsx
│     │  └─ NoticeForm.module.css
│     │
│     ├─ spots
│     │  ├─ SpotListItem.jsx
│     │  ├─ SpotListItem.module.css
│     │  ├─ SpotForm.jsx
│     │  └─ SpotForm.module.css
│     │
│     └─ logs
│        ├─ LogListItem.jsx
│        └─ LogListItem.module.css
│
├─ pages
│  └─ Admin
│     ├─ AdminRoutes.jsx
│     │
│     ├─ Dashboard
│     │  ├─ AdminDashboard.jsx
│     │  └─ AdminDashboard.module.css
│     │
│     ├─ Users
│     │  ├─ AdminUserList.jsx
│     │  ├─ AdminUserDetail.jsx
│     │  └─ AdminUsers.module.css
│     │
│     ├─ Groups
│     │  ├─ AdminGroupList.jsx
│     │  ├─ AdminGroupDetail.jsx
│     │  └─ AdminGroups.module.css
│     │
│     ├─ Posts
│     │  ├─ AdminPostList.jsx
│     │  ├─ AdminPostDetail.jsx
│     │  └─ AdminPosts.module.css
│     │
│     ├─ Reports
│     │  ├─ AdminReportList.jsx
│     │  ├─ AdminReportDetail.jsx
│     │  └─ AdminReports.module.css
│     │
│     ├─ Inquiries
│     │  ├─ AdminInquiryList.jsx
│     │  ├─ AdminInquiryDetail.jsx
│     │  └─ AdminInquiries.module.css
│     │
│     ├─ Notices
│     │  ├─ AdminNoticeList.jsx
│     │  ├─ AdminNoticeForm.jsx
│     │  └─ AdminNotices.module.css
│     │
│     ├─ Spots
│     │  ├─ AdminSpotList.jsx
│     │  ├─ AdminSpotForm.jsx
│     │  └─ AdminSpots.module.css
│     │
│     ├─ Analytics
│     │  ├─ AdminAnalytics.jsx
│     │  └─ AdminAnalytics.module.css
│     │
│     ├─ Managers
│     │  ├─ AdminManagerList.jsx
│     │  └─ AdminManagers.module.css
│     │
│     └─ Logs
│        ├─ AdminLogList.jsx
│        └─ AdminLogs.module.css
│
├─ services
│  └─ admin
│     ├─ adminDashboardService.js
│     ├─ adminUserService.js
│     ├─ adminGroupService.js
│     ├─ adminPostService.js
│     ├─ adminReportService.js
│     ├─ adminInquiryService.js
│     ├─ adminNoticeService.js
│     ├─ adminSpotService.js
│     ├─ adminAnalyticsService.js
│     ├─ adminManagerService.js
│     └─ adminLogService.js
│
└─ data
   └─ admin
      ├─ mockAdminDashboard.js
      ├─ mockAdminUsers.js
      ├─ mockAdminGroups.js
      ├─ mockAdminPosts.js
      ├─ mockAdminReports.js
      ├─ mockAdminInquiries.js
      ├─ mockAdminNotices.js
      ├─ mockAdminSpots.js
      ├─ mockAdminAnalytics.js
      ├─ mockAdminManagers.js
      └─ mockAdminLogs.js
```

---

## 9. 画面とファイルの対応表

| No | 画面 | ファイル |
|---:|---|---|
| 1 | ダッシュボード | `src/pages/Admin/Dashboard/AdminDashboard.jsx` |
| 2 | ユーザー一覧 | `src/pages/Admin/Users/AdminUserList.jsx` |
| 3 | ユーザー詳細 | `src/pages/Admin/Users/AdminUserDetail.jsx` |
| 4 | 旅行グループ一覧 | `src/pages/Admin/Groups/AdminGroupList.jsx` |
| 5 | グループ詳細 | `src/pages/Admin/Groups/AdminGroupDetail.jsx` |
| 6 | 話し合い・投稿一覧 | `src/pages/Admin/Posts/AdminPostList.jsx` |
| 7 | 投稿詳細・モデレーション | `src/pages/Admin/Posts/AdminPostDetail.jsx` |
| 8 | 通報一覧 | `src/pages/Admin/Reports/AdminReportList.jsx` |
| 9 | 通報詳細 | `src/pages/Admin/Reports/AdminReportDetail.jsx` |
| 10 | お問い合わせ一覧 | `src/pages/Admin/Inquiries/AdminInquiryList.jsx` |
| 11 | お問い合わせ詳細 | `src/pages/Admin/Inquiries/AdminInquiryDetail.jsx` |
| 12 | お知らせ管理 | `src/pages/Admin/Notices/AdminNoticeList.jsx` |
| 13 | お知らせ作成・編集 | `src/pages/Admin/Notices/AdminNoticeForm.jsx` |
| 14 | スポット一覧 | `src/pages/Admin/Spots/AdminSpotList.jsx` |
| 15 | スポット詳細・編集 | `src/pages/Admin/Spots/AdminSpotForm.jsx` |
| 16 | 分析・利用状況 | `src/pages/Admin/Analytics/AdminAnalytics.jsx` |
| 17 | 管理者・権限管理 | `src/pages/Admin/Managers/AdminManagerList.jsx` |
| 18 | 操作ログ | `src/pages/Admin/Logs/AdminLogList.jsx` |

---

## 10. ルーティング方針

管理者画面は、既存のユーザー側画面と分けるために `/admin` 以下にまとめます。

```txt
/admin
/admin/users
/admin/users/:userId
/admin/groups
/admin/groups/:groupId
/admin/posts
/admin/posts/:postId
/admin/reports
/admin/reports/:reportId
/admin/inquiries
/admin/inquiries/:inquiryId
/admin/notices
/admin/notices/new
/admin/notices/:noticeId/edit
/admin/spots
/admin/spots/new
/admin/spots/:spotId/edit
/admin/analytics
/admin/managers
/admin/logs
```

---

## 11. Bottom Navigation構成

スマホ管理画面では、BottomNavは以下の5つにします。

```txt
ホーム / ユーザー / グループ / 対応 / 設定
```

| BottomNav | 遷移先 | 内容 |
|---|---|---|
| ホーム | `/admin` | ダッシュボード |
| ユーザー | `/admin/users` | ユーザー一覧・詳細 |
| グループ | `/admin/groups` | 旅行グループ一覧・詳細 |
| 対応 | `/admin/reports` | 通報・問い合わせ・投稿対応 |
| 設定 | `/admin/notices` | お知らせ・スポット・分析・管理者・ログ |

---

## 12. デザイン方針

作成済みの管理画面デザイン画像に合わせ、以下の方針で実装します。

- スマホ画面を前提にする
- 白背景をベースにする
- メインカラーは青
- カード型レイアウトを使う
- 角丸を多めにする
- 余白を広めに取る
- ステータスはバッジで表示する
- 一覧画面には検索欄とフィルターアイコンを置く
- 詳細画面には戻るボタンを置く
- 主要画面にはBottomNavを表示する
- 操作ボタンは画面下部またはカード下部に置く
- 危険な操作は赤色ボタンにする

---

## 13. 実装ルール

Claude Codeに作成してもらうときは、以下のルールを守ってください。

- Reactで作成する
- `.jsx` を使う
- TypeScriptは使わない
- CSSは `module.css` を使う
- 既存の画面や既存コンポーネントを壊さない
- 管理画面関連は `Admin` フォルダー内にまとめる
- 既存の `src/pages` 直下に管理画面ファイルを散らばらせない
- 既存の `src/components` 直下に管理画面コンポーネントを散らばらせない
- 仮データは `src/data/admin` に置く
- API通信処理は `src/services/admin` に置く
- まずはモックデータで画面を表示できる状態にする
- バックエンドAPIとの接続は後から差し替えられるようにする
- `App.jsx` には `/admin/*` のルートを追加する
- `react-router-dom` を使う前提で実装する
- 画像デザインと同じようにスマホ幅で見やすいUIにする

---

## 14. Claude Codeに依頼する内容

以下をClaude Codeに貼り付けて作業を依頼してください。

```txt
TABIアプリの運営者向け管理者画面を作成してください。

目的：
TABIアプリ全体を管理する運営者が、ユーザー、旅行グループ、投稿、通報、お問い合わせ、お知らせ、スポット、分析、管理者権限、操作ログを確認・管理できる画面を作ることです。

前提：
- React + Vite の既存プロジェクトです。
- JavaScript / JSX で作成してください。
- TypeScriptは使わないでください。
- CSSは module.css を使ってください。
- 既存のユーザー側画面は壊さないでください。
- 管理者画面関連は src/pages/Admin と src/components/Admin にまとめてください。
- まずはモックデータで画面を表示してください。
- API接続は後で差し替えられるよう、src/services/admin に関数を分けてください。

作成する主なページ：
1. ダッシュボード
2. ユーザー一覧
3. ユーザー詳細
4. 旅行グループ一覧
5. グループ詳細
6. 話し合い・投稿一覧
7. 投稿詳細・モデレーション
8. 通報一覧
9. 通報詳細
10. お問い合わせ一覧
11. お問い合わせ詳細
12. お知らせ管理
13. お知らせ作成・編集
14. スポット一覧
15. スポット詳細・編集
16. 分析・利用状況
17. 管理者・権限管理
18. 操作ログ

ルーティング：
/admin
/admin/users
/admin/users/:userId
/admin/groups
/admin/groups/:groupId
/admin/posts
/admin/posts/:postId
/admin/reports
/admin/reports/:reportId
/admin/inquiries
/admin/inquiries/:inquiryId
/admin/notices
/admin/notices/new
/admin/notices/:noticeId/edit
/admin/spots
/admin/spots/new
/admin/spots/:spotId/edit
/admin/analytics
/admin/managers
/admin/logs

BottomNav：
ホーム / ユーザー / グループ / 対応 / 設定

デザイン方針：
- スマホ画面前提
- 白背景
- 青をメインカラー
- 角丸カード
- 下部BottomNav
- 一覧はカード形式
- 検索バーとフィルターアイコンを配置
- ステータスはバッジ表示
- 詳細画面には戻るボタン
- 危険操作は赤ボタン
- 添付した管理者画面デザイン画像に近い見た目にしてください。

実装順：
1. AdminLayout / AdminHeader / AdminBottomNav を作成
2. 共通コンポーネントを作成
3. モックデータを作成
4. 各ページを作成
5. AdminRoutes.jsx を作成
6. App.jsx に /admin/* を追加
7. npm run dev で表示確認

注意：
既存画面のルーティングやコンポーネントを壊さないようにしてください。
```

---

## 15. Claude Codeに実装してもらう順番

一度に全部作るとエラーが出たときに原因を探しにくくなるため、以下の順番で依頼するのがおすすめです。

### Step 1: レイアウトとルーティング

- `AdminLayout.jsx`
- `AdminHeader.jsx`
- `AdminBottomNav.jsx`
- `AdminRoutes.jsx`
- `App.jsx` への `/admin/*` 追加

### Step 2: 共通コンポーネント

- `AdminCard.jsx`
- `AdminStatCard.jsx`
- `AdminSearchBar.jsx`
- `AdminTabs.jsx`
- `AdminStatusBadge.jsx`
- `AdminPagination.jsx`
- `AdminEmptyState.jsx`

### Step 3: モックデータ

- `mockAdminDashboard.js`
- `mockAdminUsers.js`
- `mockAdminGroups.js`
- `mockAdminPosts.js`
- `mockAdminReports.js`
- `mockAdminInquiries.js`
- `mockAdminNotices.js`
- `mockAdminSpots.js`
- `mockAdminAnalytics.js`
- `mockAdminManagers.js`
- `mockAdminLogs.js`

### Step 4: 主要ページ

- ダッシュボード
- ユーザー一覧・詳細
- グループ一覧・詳細
- 通報一覧・詳細
- お問い合わせ一覧・詳細

### Step 5: その他ページ

- 投稿一覧・詳細
- お知らせ一覧・作成編集
- スポット一覧・編集
- 分析
- 管理者権限
- 操作ログ

---

## 16. まず確認するURL

実装後は、以下のURLを確認します。

```txt
http://localhost:5173/admin
http://localhost:5173/admin/users
http://localhost:5173/admin/groups
http://localhost:5173/admin/reports
http://localhost:5173/admin/inquiries
http://localhost:5173/admin/notices
```

Viteのポートが違う場合は、ターミナルに表示されるURLに合わせてください。

---

## 17. 補足

今回の管理画面は、あくまでTABIアプリの運営者向けです。

そのため、コテージの運用者が施設予約や清掃を管理するための画面ではありません。

TABI運営者が見るべきものは、以下の4つが中心です。

1. アプリ全体の状況を見る
2. ユーザーと旅行グループを管理する
3. 通報・問い合わせなどの問題に対応する
4. お知らせやスポットなど運営側データを管理する

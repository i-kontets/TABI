/**
 * 管理者向け画面の表示と、管理 API から取得したデータの操作を担当します。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: 管理 API から取得した一覧や詳細データ、画面上の検索条件や入力値を主に扱います。
 */
import { Navigate, Routes, Route } from 'react-router-dom';

import Dashboard from './Dashboard/Dashboard';
import UserList from './Users/UserList';
import UserDetail from './Users/UserDetail';
import GroupList from './Groups/GroupList';
import GroupDetail from './Groups/GroupDetail';
import PostList from './Posts/PostList';
import PostDetail from './Posts/PostDetail';
import ReportDetail from './Reports/ReportDetail';
import InquiryDetail from './Inquiries/InquiryDetail';
import SupportPage from './Support/SupportPage';
import NoticeList from './Notices/NoticeList';
import NoticeForm from './Notices/NoticeForm';
import SpotList from './Spots/SpotList';
import SpotForm from './Spots/SpotForm';
import Analytics from './Analytics/Analytics';
import Activities from './Activities/Activities';
import Managers from './Managers/Managers';
// import Logs from './Logs/Logs';
import Settings from './Settings/Settings';
import SystemErrors from './SystemErrors/SystemErrors';
import AdminServiceGate from './AdminServiceGate';
import AdminRealtimeListener from "./Realtime/AdminRealtimeListener";

/**
 * 管理者画面のルーティング
 * App.jsx で <Route path="/admin/*" element={<AdminRoutes />} /> として使用する。
 * ※ここでのpathは /admin 以下の相対パス
 */
export default function AdminRoutes() {
    return (
        <AdminServiceGate>
            <AdminRealtimeListener />
            <Routes>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UserList />} />
                <Route path="users/:userId" element={<UserDetail />} />
                <Route path="groups" element={<GroupList />} />
                <Route path="groups/:groupId" element={<GroupDetail />} />
                <Route path="posts" element={<PostList />} />
                <Route path="posts/:postId" element={<PostDetail />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="reports" element={<Navigate to="/admin/support?type=reports" replace />} />
                <Route path="reports/:reportId" element={<ReportDetail />} />
                <Route path="inquiries" element={<Navigate to="/admin/support?type=inquiries" replace />} />
                <Route path="inquiries/:inquiryId" element={<InquiryDetail />} />
                <Route path="notices" element={<NoticeList />} />
                <Route path="notices/new" element={<NoticeForm />} />
                <Route path="notices/:noticeId/edit" element={<NoticeForm />} />
                <Route path="spots" element={<SpotList />} />
                <Route path="spots/new" element={<SpotForm />} />
                <Route path="spots/:spotId/edit" element={<SpotForm />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="activities" element={<Activities />} />
                <Route path="managers" element={<Managers />} />
                {/* <Route path="logs" element={<Logs />} /> */}
                <Route path="settings" element={<Settings />} />
                <Route path="system-errors" element={<SystemErrors />} />
            </Routes>
        </AdminServiceGate>
    );
}

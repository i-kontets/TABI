/**
 * アプリ全体のルーティングと、旅行グループ情報を共有する大元の画面を担当します。
 *
 * 主な流れ:
 * 1. 全ページのコンポーネントを読み込み、URLと画面の対応表(Routes)を定義する
 * 2. 選択中の旅行グループ(trip)を Context に入れ、どの画面からでも参照できるようにする
 * 3. サービス稼働状態のチェック(ServiceAvailabilityGate)を通してから各画面を表示する
 *
 * 扱うデータ: 選択中の旅行グループ { id, name }(TripContext 経由で全画面に共有)。
 */
// React の状態管理フックを読み込みます。
import { useCallback, useState } from 'react'
// ルーティング(URLと画面の対応付け)用の部品を読み込みます。
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// 画面をまたいで値を共有するための Context 作成関数を読み込みます。
import { createContext } from 'react';
import './App.css'
import InvoiceAll from './pages/InvoiceAll/InvoiceAll.jsx';
import InvoiceLiquidation from './pages/InvoiceLiquidation/InvoiceLiquidation.jsx';
import InvoiceTotal from './pages/InvoiceTotal/InvoiceTotal.jsx';
import ItineraryJoin from './pages/ItineraryJoin/ItineraryJoin.jsx';

// ===== 各ページコンポーネントの読み込み =====
import Newreg from './pages/newreg/Newreg';                    // 新規会員登録
import Login from './pages/Login/Login';                        // ログイン
import ResetPassword from './pages/ResetPassword/ResetPassword.jsx'; // パスワード再設定
import Home from './pages/Home/Home';                           // ホーム(グループ一覧)
import MyPage from './pages/MyPage/MyPage';                     // マイページ
// マイページ配下のサブページ群(プロフィール編集・メール変更・通知設定など)
import { ProfileEditPage, UserEditPage, EmailChangePage, NotificationSettingsPage, NotificationPermissionPage, ContactPage, FaqPage } from './pages/MyPage/MyPageSubPages';
import Terms from './pages/Terms/Terms.jsx';                    // 利用規約
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy.jsx'; // プライバシーポリシー
import UserProfilePage from './pages/UserProfile/UserProfilePage.jsx'; // 他ユーザーの公開プロフィール
import Itinerary from './pages/Itinerary/Itinerary.jsx';        // 旅程(しおり)表示
import ItineraryEdit from './pages/ItineraryEdit/ItineraryEdit.jsx'; // 旅程編集
import Tripmap from './pages/Tripmap/Tripmap';                  // 旅行マップ
import Schedule from './pages/Schedule/Schedule.jsx';           // スケジュール
import Chat from './pages/Chat/Chat';                           // グループチャット
import Album from './pages/Album/album.jsx';                    // アルバム(写真共有)
import Invoice from './pages/Invoice/Invoice';                  // 割り勘・精算
import Appointment from './pages/Appointment/Appointment.jsx';  // 日程調整
import Discussion from './pages/Discussion/Discussion';         // 話し合い(候補・投票)
import CheckList from './pages/CheckList/CheckList';            // 持ち物チェックリスト
import Other from './pages/Other/Other.jsx';                    // その他メニュー
// import TouristRanking from './pages/TouristRanking/TouristRanking';
import Candidates from './pages/Candidates/Candidates';         // 行き先候補一覧
import CandidateDetail from './pages/Candidates/CandidateDetail.jsx'; // 候補の詳細
import Tourist from './pages/Tourist/Tourist';                  // 観光スポット一覧
import CottageChatPage from './pages/CottageChat/CottageChatPage.jsx'; // コテージ(宿)チャット
import AdminRoutes from './pages/Admin/AdminRoutes.jsx';        // 管理画面のルーティング一式
import UserRealtimeListener from './pages/UserRealtimeListener.jsx'; // WebSocketのリアルタイム受信係
import Maintenance from './pages/Maintenance/Maintenance.jsx';  // メンテナンス画面
import NotificationListPage from './pages/Notifications/NotificationListPage.jsx';   // 通知一覧
import NotificationDetailPage from './pages/Notifications/NotificationDetailPage.jsx'; // 通知詳細
import ServiceAvailabilityGate from './components/ServiceAvailabilityGate.jsx'; // DB稼働状態の門番

// 選択中の旅行グループ情報を全画面で共有するための Context です。
// 各画面は useContext(TripContext) で { trip, setTrip } を受け取れます。
// eslint-disable-next-line react-refresh/only-export-components
export const TripContext = createContext();

function App() {
    const [trip, setTrip] = useState({});
    const [members, setMembers] = useState([]);
    const [tripPeriod, setTripPeriod] = useState(null);

    const fetchMembers = useCallback(async (groupId) => {
        if (!groupId) {
            setMembers([]);
            return {
                success: false,
                status: "missing-group-id",
                members: [],
            };
        }

        try {
            const response = await fetch("/TABI/api/Itinerary/Members.php", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    group_id: groupId,
                }),
            });

            if (response.status === 401) {
                setMembers([]);
                return {
                    success: false,
                    status: "login-required",
                    members: [],
                };
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.members)) {
                const normalizedMembers = data.members.map((member) => ({
                    ...member,
                    name: member.name ?? "",
                    initial: member.initial ?? member.name?.charAt(0) ?? "?",
                    color: member.color ?? "#b5ead7",
                    role: member.role ?? "member",
                }));

                setMembers(normalizedMembers);
                return {
                    success: true,
                    status: "ready",
                    members: normalizedMembers,
                };
            }

            setMembers([]);
            return {
                success: false,
                status: "empty",
                members: [],
            };
        } catch (error) {
            console.error(error);
            setMembers([]);
            return {
                success: false,
                status: "error",
                members: [],
            };
        }
    }, []);

    return (
        <TripContext.Provider
            value={{
                trip,
                setTrip,
                members,
                setMembers,
                fetchMembers,
                tripPeriod,
                setTripPeriod,
            }}
        >
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <UserRealtimeListener trip={trip} />
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    {/* DB停止時に表示するメンテナンス画面 */}
                    <Route path="/maintenance" element={<Maintenance />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/MyPage" element={<MyPage />} />
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/mypage/profile-edit" element={<ProfileEditPage />} />
                    <Route path="/mypage/user-edit" element={<UserEditPage />} />
                    <Route path="/mypage/email-change" element={<EmailChangePage />} />
                    <Route path="/mypage/notification-settings" element={<NotificationSettingsPage />} />
                    <Route path="/mypage/notification-permission" element={<NotificationPermissionPage />} />
                    <Route path="/mypage/contact" element={<ContactPage />} />
                    <Route path="/mypage/faq" element={<FaqPage />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                    <Route path="/ItineraryJoin" element={<ItineraryJoin />} />
                    <Route path="/ItineraryEdit" element={<ItineraryEdit />} />
                    <Route path="/Tripmap" element={<Tripmap />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/Chat" element={<Chat />} />
                    <Route path="/Discussion" element={<Discussion />} />
                    <Route path="/group/:groupId/talk" element={<Discussion />} />
                    <Route path="/album" element={<Album />} />
                    <Route path="/Invoice" element={<Invoice />} />
                    <Route path="/InvoiceAll" element={<InvoiceAll />} />
                    <Route path="/InvoiceLiquidation" element={<InvoiceLiquidation />} />
                    <Route path="/InvoiceTotal" element={<InvoiceTotal />} />
                    <Route path="/Appointment" element={<Appointment />} />
                    <Route path="/Other" element={<Other />} />
                    {/* <Route path="/TouristRanking" element={<TouristRanking />} /> */}
                    <Route path="/Candidates" element={<Candidates />} />
                    <Route path="/Candidates/:candidateId" element={<CandidateDetail />} />
                    <Route path="/Tourist" element={<Tourist />} />
                    <Route path="/TouristRanking" element={<Tourist />} />
                    <Route path="/CottageChatPage" element={<CottageChatPage />} />
                    <Route path="/CheckList" element={<CheckList />} />
                    <Route path="/admin/*" element={<AdminRoutes />} />
                </Routes>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

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
import { useState } from 'react'
// ルーティング(URLと画面の対応付け)用の部品を読み込みます。
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
// 画面をまたいで値を共有するための Context 作成関数を読み込みます。
import { createContext } from 'react';
import './App.css'

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
import ItineraryEdit from './pages/Itinerary/ItineraryEdit.jsx'; // 旅程編集
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
import { isAdminPath, isMaintenancePath } from './services/serviceStatus.js';   // パス判定ヘルパー

// 選択中の旅行グループ情報を全画面で共有するための Context です。
// 各画面は useContext(TripContext) で { trip, setTrip } を受け取れます。
// eslint-disable-next-line react-refresh/only-export-components
export const TripContext = createContext();

/**
 * AppRoutes は、URLと表示する画面の対応表を定義するコンポーネントです。
 * あわせて、一般ユーザー向け画面ではリアルタイム受信(WebSocket)を有効にします。
 */
function AppRoutes({ trip }) {
    // 現在のURL情報を取得します。
    const location = useLocation();
    // 管理画面とメンテナンス画面では、ユーザー向けリアルタイム受信を動かさないようにします。
    const shouldRunUserRealtime = !isAdminPath(location.pathname) && !isMaintenancePath(location.pathname);

    return (
        <>
            {/* 一般ユーザー画面のときだけ、通知やチャットのリアルタイム受信係を起動します */}
            {shouldRunUserRealtime && <UserRealtimeListener trip={trip} />}
            <Routes>
                {/* ===== 認証系 ===== */}
                <Route path="/" element={<Login />} />
                <Route path="/ResetPassword" element={<ResetPassword />} />
                <Route path="/Newreg" element={<Newreg />} />
                {/* ===== ホーム・マイページ系 ===== */}
                <Route path="/Home" element={<Home />} />
                {/* 大文字・小文字どちらのURLでもマイページを開けるように2つ登録しています */}
                <Route path="/MyPage" element={<MyPage />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/mypage/profile-edit" element={<ProfileEditPage />} />
                <Route path="/mypage/user-edit" element={<UserEditPage />} />
                <Route path="/mypage/email-change" element={<EmailChangePage />} />
                <Route path="/mypage/notification-settings" element={<NotificationSettingsPage />} />
                <Route path="/mypage/notification-permission" element={<NotificationPermissionPage />} />
                {/* ===== 通知系 ===== */}
                <Route path="/notifications" element={<NotificationListPage />} />
                {/* :notificationId はURLの一部が変数になる書き方です(例: /notifications/5) */}
                <Route path="/notifications/:notificationId" element={<NotificationDetailPage />} />
                {/* ===== サポート・規約系 ===== */}
                <Route path="/mypage/contact" element={<ContactPage />} />
                <Route path="/mypage/faq" element={<FaqPage />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                {/* ===== ユーザープロフィール ===== */}
                <Route path="/user/:userId" element={<UserProfilePage />} />
                {/* ===== 旅行計画系 ===== */}
                <Route path="/Itinerary" element={<Itinerary />} />
                <Route path="/ItineraryEdit" element={<ItineraryEdit />} />
                <Route path="/Tripmap" element={<Tripmap />} />
                <Route path="/schedule" element={<Schedule />} />
                {/* ===== コミュニケーション系 ===== */}
                <Route path="/Chat" element={<Chat />} />
                {/* <Route path="/Discussion" element={<Discussion />} /> */}
                <Route path="/group/:groupId/talk" element={<Discussion />} />
                <Route path="/album" element={<Album />} />
                {/* ===== 精算・日程調整・その他 ===== */}
                <Route path="/Invoice" element={<Invoice />} />
                <Route path="/Appointment" element={<Appointment />} />
                <Route path="/Other" element={<Other />} />
                {/* <Route path="/TouristRanking" element={<TouristRanking />} /> */}
                {/* ===== 行き先候補・観光スポット ===== */}
                <Route path="/Candidates" element={<Candidates />} />
                <Route path="/Candidates/:candidateId" element={<CandidateDetail />} />
                <Route path="/Tourist" element={<Tourist />} />
                {/* 旧URL(/TouristRanking)でも観光スポット画面を表示します */}
                <Route path="/TouristRanking" element={<Tourist />} />
                <Route path="/CottageChatPage" element={<CottageChatPage />} />
                <Route path="/CheckList" element={<CheckList /> }/>
                {/* ===== メンテナンス・管理画面 ===== */}
                <Route path="/maintenance" element={<Maintenance />} />
                {/* /admin/ 以下はすべて AdminRoutes に任せます("*" は下層全部の意味) */}
                <Route path="/admin/*" element={<AdminRoutes />} />
            </Routes>
        </>
    );
}

/**
 * App は、アプリ全体の最上位コンポーネントです。
 * 旅行グループの共有(Context)→ ルーター → 稼働状態チェック → 各画面 の順に包んでいます。
 */
function App() {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    // ここでは「現在選択中の旅行グループ」を保持します(初期状態は未選択)。
    const [trip, setTrip] = useState({
        id: null,   // 旅行グループのID(未選択なら null)
        name: ""    // 旅行グループの表示名
    });

    return (
        // TripContext.Provider: 配下のすべての画面が trip / setTrip を使えるようにします。
        <TripContext.Provider value={{ trip, setTrip }}>
            {/* basename: サブディレクトリ(/TABI など)配下で動かすためのURL接頭辞です */}
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                {/* DBが停止中ならメンテナンス画面へ誘導する門番コンポーネントです */}
                <ServiceAvailabilityGate>
                    <AppRoutes trip={trip} />
                </ServiceAvailabilityGate>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

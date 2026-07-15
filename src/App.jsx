import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { createContext } from 'react';
import './App.css'

import Newreg from './pages/newreg/Newreg';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import MyPage from './pages/MyPage/MyPage';
import { ProfileEditPage, UserEditPage, EmailChangePage, NotificationSettingsPage, NotificationPermissionPage, ContactPage, FaqPage } from './pages/MyPage/MyPageSubPages';
import Terms from './pages/Terms/Terms.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy.jsx';
import UserProfilePage from './pages/UserProfile/UserProfilePage.jsx';
import Itinerary from './pages/Itinerary/Itinerary.jsx';
import ItineraryEdit from './pages/Itinerary/ItineraryEdit.jsx';
import Tripmap from './pages/Tripmap/Tripmap';
import Schedule from './pages/Schedule/Schedule.jsx';
import Chat from './pages/Chat/Chat';
import Album from './pages/Album/album.jsx';
import Invoice from './pages/Invoice/Invoice';
import Appointment from './pages/Appointment/Appointment.jsx';
import Discussion from './pages/Discussion/Discussion';
import CheckList from './pages/CheckList/CheckList';
import Other from './pages/Other/Other.jsx';
import Tourist from './pages/Tourist/Tourist';
import AdminRoutes from './pages/Admin/AdminRoutes.jsx';
import UserRealtimeListener from './pages/UserRealtimeListener.jsx';
import Maintenance from './pages/Maintenance/Maintenance.jsx';
import ServiceAvailabilityGate from './components/ServiceAvailabilityGate.jsx';
import { isAdminPath, isMaintenancePath } from './services/serviceStatus.js';

// eslint-disable-next-line react-refresh/only-export-components
export const TripContext = createContext();

function AppRoutes({ trip }) {
    const location = useLocation();
    const shouldRunUserRealtime = !isAdminPath(location.pathname) && !isMaintenancePath(location.pathname);

    return (
        <>
            {shouldRunUserRealtime && <UserRealtimeListener trip={trip} />}
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Newreg" element={<Newreg />} />
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
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/user/:userId" element={<UserProfilePage />} />
                <Route path="/Itinerary" element={<Itinerary />} />
                <Route path="/ItineraryEdit" element={<ItineraryEdit />} />
                <Route path="/Tripmap" element={<Tripmap />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/Chat" element={<Chat />} />
                <Route path="/Discussion" element={<Discussion />} />
                <Route path="/group/:groupId/talk" element={<Discussion />} />
                <Route path="/album" element={<Album />} />
                <Route path="/Invoice" element={<Invoice />} />
                <Route path="/Appointment" element={<Appointment />} />
                <Route path="/Other" element={<Other />} />
                <Route path="/Tourist" element={<Tourist />} />
                <Route path="/TouristRanking" element={<Tourist />} />
                <Route path="/CheckList" element={<CheckList />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/admin/*" element={<AdminRoutes />} />
            </Routes>
        </>
    );
}

function App() {
    const [trip, setTrip] = useState({
        id: null,
        name: ""
    });

    return (
        <TripContext.Provider value={{ trip, setTrip }}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <ServiceAvailabilityGate>
                    <AppRoutes trip={trip} />
                </ServiceAvailabilityGate>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

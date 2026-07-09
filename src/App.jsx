import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createContext } from 'react';
import './App.css'

import Newreg from './pages/newreg/Newreg';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
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
// import TouristRanking from './pages/TouristRanking/TouristRanking';
import Candidates from './pages/Candidates/Candidates';
import Tourist from './pages/Tourist/Tourist';

export const TripContext = createContext();

function App() {
    const [trip, setTrip] = useState({
        id: null,
        name: ""
    });

    return (
        <TripContext.Provider value={{ trip, setTrip }}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                    <Route path="/ItineraryEdit" element={<ItineraryEdit />} />
                    <Route path="/Tripmap" element={<Tripmap />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/Chat" element={<Chat />} />
                    <Route path="/Discussion" element={<Discussion />} />
                    <Route path="/group/:groupId/talk" element={<Discussion />} />
                    <Route path="/album" element={<Album />} />
                    <Route path="/Invoice" element={<Invoice />} />
                    <Route path="/Appointment" element={<Appointment />}/>
                    <Route path="/Other" element={<Other />} />
                    {/* <Route path="/TouristRanking" element={<TouristRanking />} /> */}
                    <Route path="/Candidates" element={<Candidates />} />
                    <Route path="/Tourist" element={<Tourist />} />
                    <Route path="/CheckList" element={<CheckList /> }/>
                </Routes>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

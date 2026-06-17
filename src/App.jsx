import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createContext } from 'react';
import './App.css'

import Newreg from './pages/newreg/Newreg';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Itinerary from './pages/Itinerary/itinerary';
import ItineraryEdit from './pages/Itinerary/itinerary_edit';
import Tripmap from './pages/Tripmap/Tripmap';
import Schedule  from './pages/Schedule/Schedule';
import Chat from './pages/Chat/Chat';
import Album from './pages/Album/album.jsx';
import Invoice from './pages/Invoice/Invoice';
import Appointment from './pages/appointment/appointment.jsx';
import Confirmation from './pages/Appointment/Confirmation.jsx';
import Decision from './pages/Appointment/Decision.jsx';

export const TripContext = createContext();

function App() {
    const [tripName, setTripName] = useState("");

    return (
        <TripContext.Provider value={{ tripName, setTripName }}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                    <Route path="/ItineraryEdit" element={<ItineraryEdit />} />
                    <Route path="/Tripmap" element={<Tripmap />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/album" element={<Album />} />
                    <Route path="/Invoice" element={<Invoice />} />
                    <Route path="/appointment" element={<Appointment />}/>
                    <Route path="/confirmation" element={<Confirmation />}/>
                                        <Route path="/decision" element={<Decision />}/>
                </Routes>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

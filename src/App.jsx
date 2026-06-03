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
import Schedule  from './pages/Schedule/schedule';
import Album from './pages/Album/album.jsx';
import Invoice from './pages/Invoice/Invoice';

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
                    <Route path="/album" element={<Album />} />
                    <Route path="/Invoice" element={<Invoice />} />
                </Routes>
            </BrowserRouter>
        </TripContext.Provider>
    )
}

export default App

import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'

import Newreg from './pages/newreg/Newreg';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Itinerary from './pages/Itinerary/itinerary';
import Tripmap from './pages/Tripmap/Tripmap';
import Schedule  from './pages/Schedule/Schedule';
import Chat from './pages/Chat/Chat';
import Album from './pages/Album/album.jsx';

function App() {

    return (
        <>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                    <Route path="/Tripmap" element={<Tripmap />} />
                    <Route path="/schedule" element={<Schedule />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/album" element={<Album />} />
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App

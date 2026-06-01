import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'

import Newreg from './pages/newreg/Newreg';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Itinerary from './pages/Itinerary/itinerary';
import Invoice from './pages/Invoice/invoice';

function App() {

    return (
        <>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                    <Route path="/Invoice" element={<Invoice />} />
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App

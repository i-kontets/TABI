import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'

import Newreg from './page/newreg/Newreg';
import Login from './page/Login/Login';
import Home from './page/Home/Home';
import Itinerary from './page/Itinerary/itinerary';

function App() {

    return (
        <>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/Newreg" element={<Newreg />} />
                    <Route path="/Home" element={<Home />} />
                    <Route path="/Itinerary" element={<Itinerary />} />
                </Routes>
            </BrowserRouter>
        </>
    )
}

export default App

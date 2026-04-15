import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'

import Newreg from './page/newreg/Newreg';
import Login from './page/Login/Login';
import Home from './page/Home/Home';

function App() {

return (
    <>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Newreg" element={<Newreg />} />
                <Route path="/Home" element={<Home />} />
            </Routes>
        </BrowserRouter>
    </>
)
}

export default App

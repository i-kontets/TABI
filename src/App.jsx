import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'

import Home from './page/Home/Home';
import Newreg from './page/newreg/Newreg';

function App() {

return (
    <>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/Newreg" element={<Newreg />} />
            </Routes>
        </BrowserRouter>
    </>
)
}

export default App

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import App from './pages/App.jsx'
import Search from './pages/Search.jsx'
import Car from './pages/Car.jsx'
import AgencyLogin from './pages/AgencyLogin.jsx'
import AgencyRegister from './pages/AgencyRegister.jsx'
import AgencyDashboard from './pages/AgencyDashboard.jsx'
import AddCar from './pages/AddCar.jsx'
import AddAvailability from './pages/AddAvailability.jsx'
import Bookings from './pages/Bookings.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App>
      <Routes>
        <Route path="/" element={<Search />} />
        <Route path="/car/:id" element={<Car />} />
        <Route path="/agency/login" element={<AgencyLogin />} />
        <Route path="/agency/register" element={<AgencyRegister />} />
        <Route path="/agency/dashboard" element={<AgencyDashboard />} />
        <Route path="/agency/add-car" element={<AddCar />} />
        <Route path="/agency/add-availability" element={<AddAvailability />} />
        <Route path="/agency/bookings" element={<Bookings />} />
      </Routes>
    </App>
  </BrowserRouter>
)

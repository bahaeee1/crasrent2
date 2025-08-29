import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAvailability, getCar, createBooking } from '../api.js'  // <-- single import line

function Spec({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return <li><b>{label}:</b> {value}</li>
}

export default function Car() {
  const { id } = useParams()
  const [car, setCar] = useState(null)
  const [avail, setAvail] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customer_name, setCustomerName] = useState('')
  const [customer_email, setCustomerEmail] = useState('')
  const [customer_phone, setCustomerPhone] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    (async () => {
      try { setCar(await getCar(id)) } catch {}
      try { setAvail(await getAvailability(id)) } catch {}
    })()
  }, [id])

  const book = async () => {
    setErr(null); setMsg(null)
    try {
      const r = await createBooking({
        car_id: Number(id),
        start_date: startDate,
        end_date: endDate,
        customer_name,
        customer_email,
        customer_phone
      })
      setMsg(
        `Booking created. Contact ${r.agency_name || 'the agency'} at ${r.agency_phone || 'N/A'}.\n` +
        `Total price: ${r.total_price}. Status: ${r.status}.`
      )
    } catch (e) {
      const message = e?.error?.message || e?.error || e?.message || JSON.stringify(e)
      setErr(message)
    }
  }

  if (!car) return <div className="card">Loading car...</div>

  return (
    <div className="card">
      <h2>{car.title}</h2>
      <img
        style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12 }}
        src={car.image_url || `https://picsum.photos/seed/${car.id}/1200/600`}
        alt={car.title}
      />
      <p className="muted">{car.brand} {car.model} · {car.location}</p>
      <p><b>{car.daily_price} / day</b></p>

      <h3>Agency contact</h3>
      <p>
        <b>{car.agency_name || 'Agency'}</b><br />
        Tel: <a href={`tel:${car.agency_phone || ''}`}>{car.agency_phone || '—'}</a>
      </p>

      <h3>Specifications</h3>
      <ul className="specs">
        <Spec label="Year" value={car.year} />
        <Spec label="Transmission" value={car.transmission} />
        <Spec label="Seats" value={car.seats} />
        <Spec label="Doors" value={car.doors} />
        <Spec label="Trunk volume (L)" value={car.trunk_liters} />
        <Spec label="Fuel type" value={car.fuel_type} />
      </ul>
      {car.options && <p className="muted">Options: {car.options}</p>}

      <h3>Availability</h3>
      <ul>{avail.map(a => <li key={a.id}>{a.start_date} → {a.end_date}</li>)}</ul>

      <h3>Book this car</h3>
      <div className="row">
        <div className="col-3"><label>Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div className="col-3"><label>End</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
        <div className="col-6" />
        <div className="col-4"><label>Your name</label><input value={customer_name} onChange={e => setCustomerName(e.target.value)} /></div>
        <div className="col-4"><label>Email</label><input value={customer_email} onChange={e => setCustomerEmail(e.target.value)} /></div>
        <div className="col-4"><label>Phone (optional)</label><input value={customer_phone} onChange={e => setCustomerPhone(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 12 }}><button className="btn" onClick={book}>Book</button></div>

      {msg && <div className="success" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{msg}</div>}
      {err && <div className="error" style={{ marginTop: 8 }}>{String(err)}</div>}
    </div>
  )
}

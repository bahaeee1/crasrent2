import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAvailability, searchCars, createBooking } from '../api.js'

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
    // We don't have a single-car endpoint; fetch via search without filters (not ideal, but MVP workaround)
    (async () => {
      try {
        const all = await searchCars({})
        const found = all.find(x => String(x.id) === String(id))
        setCar(found || null)
      } catch {}
      try {
        const a = await getAvailability(id)
        setAvail(a)
      } catch {}
    })()
  }, [id])

  const book = async () => {
    setErr(null); setMsg(null)
    try {
      const res = await createBooking({ car_id: Number(id), start_date: startDate, end_date: endDate, customer_name, customer_email, customer_phone })
      setMsg(
  `Booking created. Contact ${res.agency_name || 'the agency'} at ${res.agency_phone || 'N/A'}.
Total price: ${res.total_price}. Status: ${res.status}.`
)

    } catch (e) {
      setErr(e.error ? JSON.stringify(e.error) : 'Booking failed')
    }
  }

  if (!car) return <div className="card">Loading car...</div>
  return (
    <div className="card">
      <h2>{car.title}</h2>
      <img style={{width:'100%', maxHeight:360, objectFit:'cover', borderRadius:12}} src={car.image_url || 'https://picsum.photos/seed/'+car.id+'/1200/600'} alt={car.title}/>
      <p className="muted">{car.brand} {car.model} · {car.location}</p>
      <p><b>{car.daily_price} / day</b></p>

      <h3>Availability</h3>
      <ul>
        {avail.map(a => <li key={a.id}>{a.start_date} → {a.end_date}</li>)}
      </ul>

      <h3>Book this car</h3>
      <div className="row">
        <div className="col-3">
          <label>Start</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div className="col-3">
          <label>End</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>
        <div className="col-6"></div>
        <div className="col-4">
          <label>Your name</label>
          <input value={customer_name} onChange={e=>setCustomerName(e.target.value)} />
        </div>
        <div className="col-4">
          <label>Email</label>
          <input value={customer_email} onChange={e=>setCustomerEmail(e.target.value)} />
        </div>
        <div className="col-4">
          <label>Phone (optional)</label>
          <input value={customer_phone} onChange={e=>setCustomerPhone(e.target.value)} />
        </div>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={book}>Book</button>
      </div>
      {msg && <div className="success" style={{marginTop:8}}>{msg}</div>}
      {err && <div className="error" style={{marginTop:8}}>{String(err)}</div>}
    </div>
  )
}

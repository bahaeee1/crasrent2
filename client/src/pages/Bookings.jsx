import React, { useEffect, useState } from 'react'
import { myBookings } from '../api.js'

export default function Bookings() {
  const [items, setItems] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await myBookings()
        setItems(data)
      } catch (e) {
        setErr(e.error || 'Failed to load bookings')
      }
    })()
  }, [])

  return (
    <div className="card">
      <h2>Bookings</h2>
      {err && <div className="error" style={{marginBottom:8}}>{String(err)}</div>}
      <div className="grid">
        {items.map(b => (
          <div key={b.id} className="car">
            <div className="body">
              <div style={{fontWeight:700}}>{b.car_title}</div>
              <div className="muted">{b.start_date} → {b.end_date}</div>
              <div>Total: <b>{b.total_price}</b> · Status: {b.status}</div>
              <div className="muted">By: {b.customer_name} · {b.customer_email}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

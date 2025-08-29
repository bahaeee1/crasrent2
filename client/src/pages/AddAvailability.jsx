import React, { useState } from 'react'
import { addAvailability } from '../api.js'

export default function AddAvailability() {
  const [carId, setCarId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async () => {
    setMsg(null); setErr(null)
    try {
      const res = await addAvailability(Number(carId), { start_date: start, end_date: end })
      setMsg('Availability updated. Now have ' + res.length + ' ranges.')
    } catch (e) {
      setErr(e.error ? JSON.stringify(e.error) : 'Failed to add availability')
    }
  }

  return (
    <div className="card">
      <h2>Add availability</h2>
      <div className="row">
        <div className="col-3"><label>Car ID</label><input value={carId} onChange={e=>setCarId(e.target.value)} /></div>
        <div className="col-3"><label>Start</label><input type="date" value={start} onChange={e=>setStart(e.target.value)} /></div>
        <div className="col-3"><label>End</label><input type="date" value={end} onChange={e=>setEnd(e.target.value)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={submit}>Add</button>
      </div>
      {msg && <div className="success" style={{marginTop:8}}>{msg}</div>}
      {err && <div className="error" style={{marginTop:8}}>{String(err)}</div>}
    </div>
  )
}

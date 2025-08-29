import React, { useState } from 'react'
import { createCar } from '../api.js'

export default function AddCar() {
  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [daily_price, setDailyPrice] = useState('')
  const [location, setLocation] = useState('')
  const [image_url, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async () => {
    setErr(null); setMsg(null)
    try {
      const res = await createCar({ title, brand, model, daily_price: Number(daily_price), location, image_url, description })
      setMsg('Car created with id ' + res.id)
    } catch (e) {
      setErr(e.error ? JSON.stringify(e.error) : 'Failed to create car')
    }
  }

  return (
    <div className="card">
      <h2>Add a car</h2>
      <div className="row">
        <div className="col-6"><label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Dacia Duster 2023" /></div>
        <div className="col-3"><label>Brand</label><input value={brand} onChange={e=>setBrand(e.target.value)} /></div>
        <div className="col-3"><label>Model</label><input value={model} onChange={e=>setModel(e.target.value)} /></div>
        <div className="col-3"><label>Daily price</label><input type="number" value={daily_price} onChange={e=>setDailyPrice(e.target.value)} /></div>
        <div className="col-3"><label>Location</label><input value={location} onChange={e=>setLocation(e.target.value)} /></div>
        <div className="col-6"><label>Image URL</label><input value={image_url} onChange={e=>setImageUrl(e.target.value)} /></div>
        <div className="col-12"><label>Description</label><textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} /></div>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={submit}>Create</button>
      </div>
      {msg && <div className="success" style={{marginTop:8}}>{msg}</div>}
      {err && <div className="error" style={{marginTop:8}}>{String(err)}</div>}
    </div>
  )
}

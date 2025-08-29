const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

export async function registerAgency(payload) {
  const res = await fetch(API_BASE + '/api/agency/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function loginAgency(payload) {
  const res = await fetch(API_BASE + '/api/agency/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function createCar(payload) {
  const res = await fetch(API_BASE + '/api/cars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function addAvailability(carId, payload) {
  const res = await fetch(API_BASE + `/api/cars/${carId}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function getAvailability(carId) {
  const res = await fetch(API_BASE + `/api/cars/${carId}/availability`);
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function searchCars(params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(API_BASE + '/api/cars?' + qs.toString());
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function createBooking(payload) {
  const res = await fetch(API_BASE + '/api/bookings', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function myBookings() {
  const res = await fetch(API_BASE + '/api/agency/me/bookings', {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

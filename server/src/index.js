import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ----------------- Helpers -----------------
function signToken(agency) {
  return jwt.sign({ id: agency.id, email: agency.email, name: agency.name }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid Authorization header' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function daysBetween(startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const diffMs = e - s;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isValidDateISO(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function dateOrderOK(start, end) {
  return new Date(start) <= new Date(end);
}

// ----------------- Schemas -----------------
const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  location: z.string().min(2)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const CarSchema = z.object({
  title: z.string().min(2),
  brand: z.string().optional(),
  model: z.string().optional(),
  daily_price: z.number().positive(),
  location: z.string().min(2),
  image_url: z.string().url().optional(),
  description: z.string().optional()
});

const AvailabilitySchema = z.object({
  start_date: z.string(),
  end_date: z.string()
}).refine((data) => isValidDateISO(data.start_date) && isValidDateISO(data.end_date) && dateOrderOK(data.start_date, data.end_date), {
  message: 'Invalid date range; use YYYY-MM-DD and ensure start <= end'
});

const BookingSchema = z.object({
  car_id: z.number().int().positive(),
  start_date: z.string(),
  end_date: z.string(),
  customer_name: z.string().min(2),
  customer_email: z.string().email(),
  customer_phone: z.string().optional()
}).refine((data) => isValidDateISO(data.start_date) && isValidDateISO(data.end_date) && dateOrderOK(data.start_date, data.end_date), {
  message: 'Invalid date range; use YYYY-MM-DD and ensure start <= end'
});

// ----------------- DB Statements -----------------
const insertAgency = db.prepare(`
  INSERT INTO agencies (name, email, password_hash, location) VALUES (?, ?, ?, ?)
`);

const getAgencyByEmail = db.prepare(`SELECT * FROM agencies WHERE email = ?`);

const insertCar = db.prepare(`
  INSERT INTO cars (agency_id, title, brand, model, daily_price, location, image_url, description)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectCarById = db.prepare(`SELECT * FROM cars WHERE id = ?`);

const selectCarsFilteredBase = `
  SELECT DISTINCT c.*
  FROM cars c
  LEFT JOIN availability a ON a.car_id = c.id
`;

const insertAvail = db.prepare(`
  INSERT INTO availability (car_id, start_date, end_date) VALUES (?, ?, ?)
`);

const selectAvailByCar = db.prepare(`SELECT * FROM availability WHERE car_id = ? ORDER BY start_date`);

const conflictBookingExists = db.prepare(`
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.car_id = ?
      AND b.status != 'canceled'
      AND NOT (b.end_date < ? OR b.start_date > ?)
  ) as exists_conflict
`);

const availableRangeExists = db.prepare(`
  SELECT EXISTS (
    SELECT 1 FROM availability a
    WHERE a.car_id = ?
      AND a.start_date <= ?
      AND a.end_date >= ?
  ) as exists_available
`);

const insertBooking = db.prepare(`
  INSERT INTO bookings (car_id, start_date, end_date, total_price, customer_name, customer_email, customer_phone, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
`);

const selectBookingsForAgency = db.prepare(`
  SELECT b.*, c.title AS car_title
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE c.agency_id = ?
  ORDER BY b.created_at DESC
`);

// ----------------- Routes -----------------

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Agency register
app.post('/api/agency/register', (req, res) => {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { name, email, password, location } = parse.data;

  const existing = getAgencyByEmail.get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = insertAgency.run(name, email, hash, location);
  const agency = { id: info.lastInsertRowid, name, email, location };
  const token = signToken(agency);
  res.json({ token, agency });
});

// Agency login
app.post('/api/agency/login', (req, res) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { email, password } = parse.data;
  const agency = getAgencyByEmail.get(email);
  if (!agency) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, agency.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(agency);
  res.json({ token, agency: { id: agency.id, name: agency.name, email: agency.email, location: agency.location } });
});

// Create car (auth)
app.post('/api/cars', auth, (req, res) => {
  const parsed = CarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { title, brand, model, daily_price, location, image_url, description } = parsed.data;
  const info = insertCar.run(req.user.id, title, brand || null, model || null, daily_price, location, image_url || null, description || null);
  const car = selectCarById.get(info.lastInsertRowid);
  res.status(201).json(car);
});

// Add availability (auth)
app.post('/api/cars/:id/availability', auth, (req, res) => {
  const carId = Number(req.params.id);
  const car = selectCarById.get(carId);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  if (car.agency_id !== req.user.id) return res.status(403).json({ error: 'Not your car' });

  const parsed = AvailabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { start_date, end_date } = parsed.data;
  insertAvail.run(carId, start_date, end_date);
  const avail = selectAvailByCar.all(carId);
  res.json(avail);
});

// Get availability for car (public)
app.get('/api/cars/:id/availability', (req, res) => {
  const carId = Number(req.params.id);
  const car = selectCarById.get(carId);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  const avail = selectAvailByCar.all(carId);
  res.json(avail);
});

// Search cars
app.get('/api/cars', (req, res) => {
  const { location, minPrice, maxPrice, startDate, endDate, minDuration } = req.query;
  const filters = [];
  const params = [];

  if (location) {
    filters.push('c.location LIKE ?');
    params.push('%' + location + '%');
  }
  if (minPrice) {
    filters.push('c.daily_price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    filters.push('c.daily_price <= ?');
    params.push(Number(maxPrice));
  }

  // Base query
  let sql = selectCarsFilteredBase;
  if (filters.length) {
    sql += ' WHERE ' + filters.join(' AND ');
  }

  // Availability window logic if dates provided
  const usingDates = startDate && endDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate);
  if (usingDates) {
    sql += (filters.length ? ' AND ' : ' WHERE ') + 'a.start_date <= ? AND a.end_date >= ?';
    params.push(endDate, startDate); // inclusive coverage
    // Exclude cars with conflicting bookings
    sql += ' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.car_id = c.id AND b.status != \'canceled\' AND NOT (b.end_date < ? OR b.start_date > ?))';
    params.push(startDate, endDate);
  }

  sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  // Optional duration filter
  let result = rows;
  if (minDuration && usingDates) {
    const d = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000*60*60*24));
    if (d < Number(minDuration)) {
      result = []; // requested duration less than minDuration
    }
  }
  res.json(result);
});

// Book (public)
app.post('/api/bookings', (req, res) => {
  const parsed = BookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { car_id, start_date, end_date, customer_name, customer_email, customer_phone } = parsed.data;

  const car = selectCarById.get(car_id);
  if (!car) return res.status(404).json({ error: 'Car not found' });

  // Check available range exists
  const avail = availableRangeExists.get(car_id, start_date, end_date);
  if (!avail.exists_available) {
    return res.status(409).json({ error: 'Car not available for the requested dates' });
  }
  // Check no booking conflicts
  const conflict = conflictBookingExists.get(car_id, start_date, end_date);
  if (conflict.exists_conflict) {
    return res.status(409).json({ error: 'Car already booked for the requested dates' });
  }

  const days = daysBetween(start_date, end_date);
  if (days <= 0) return res.status(400).json({ error: 'End date must be after start date' });
  const total_price = days * car.daily_price;

  const info = insertBooking.run(car_id, start_date, end_date, total_price, customer_name, customer_email, customer_phone || null);
  res.status(201).json({ id: info.lastInsertRowid, total_price, status: 'pending' });
});

// Agency bookings (auth)
app.get('/api/agency/me/bookings', auth, (req, res) => {
  const rows = selectBookingsForAgency.all(req.user.id);
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

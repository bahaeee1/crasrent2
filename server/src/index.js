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

// ---------- helpers ----------
function signToken(agency) {
  return jwt.sign({ id: agency.id, email: agency.email, name: agency.name }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'Missing Authorization header' });
  const t = h.split(' ')[1];
  if (!t) return res.status(401).json({ error: 'Invalid Authorization header' });
  try { req.user = jwt.verify(t, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}
const isISO = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
const datesOK = (s, e) => new Date(s) <= new Date(e);
function daysBetween(s, e) {
  return Math.ceil((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24));
}

// ---------- validation ----------
const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  location: z.string().min(2),
  phone: z.string().min(6) // make .optional() if you want phone to be optional
});
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const CarSchema = z.object({
  title: z.string().min(2),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  transmission: z.enum(['manual','automatic']).optional(),
  seats: z.number().int().optional(),
  doors: z.number().int().optional(),
  trunk_liters: z.number().optional(),
  fuel_type: z.string().optional(),
  options: z.string().optional(),        // comma list: "AC,Bluetooth,GPS"
  daily_price: z.number().positive(),
  location: z.string().min(2),
  image_url: z.string().url().optional(),
  description: z.string().optional()
});
const AvailabilitySchema = z.object({ start_date: z.string(), end_date: z.string() })
  .refine(d => isISO(d.start_date) && isISO(d.end_date) && datesOK(d.start_date, d.end_date), { message: 'Invalid date range' });
const BookingSchema = z.object({
  car_id: z.number().int().positive(),
  start_date: z.string(),
  end_date: z.string(),
  customer_name: z.string().min(2),
  customer_email: z.string().email(),
  customer_phone: z.string().optional()
}).refine(d => isISO(d.start_date) && isISO(d.end_date) && datesOK(d.start_date, d.end_date), { message: 'Invalid date range' });

// ---------- statements ----------
const insertAgency = db.prepare(`INSERT INTO agencies (name,email,password_hash,location,phone) VALUES (?,?,?,?,?)`);
const getAgencyByEmail = db.prepare(`SELECT * FROM agencies WHERE email = ?`);

const insertCar = db.prepare(`
  INSERT INTO cars (agency_id,title,brand,model,year,transmission,seats,doors,trunk_liters,fuel_type,options,daily_price,location,image_url,description)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
const selectCarById = db.prepare(`SELECT * FROM cars WHERE id = ?`);
const selectCarWithAgency = db.prepare(`
  SELECT c.*, ag.name AS agency_name, ag.phone AS agency_phone
  FROM cars c JOIN agencies ag ON ag.id = c.agency_id
  WHERE c.id = ?
`);

const insertAvail = db.prepare(`INSERT INTO availability (car_id,start_date,end_date) VALUES (?,?,?)`);
const selectAvailByCar = db.prepare(`SELECT * FROM availability WHERE car_id = ? ORDER BY start_date`);

const availableRangeExists = db.prepare(`
  SELECT EXISTS (
    SELECT 1 FROM availability a
    WHERE a.car_id = ? AND a.start_date <= ? AND a.end_date >= ?
  ) AS ok
`);
const conflictBookingExists = db.prepare(`
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.car_id = ? AND b.status != 'canceled'
      AND NOT (b.end_date < ? OR b.start_date > ?)
  ) AS bad
`);

const insertBooking = db.prepare(`
  INSERT INTO bookings (car_id,start_date,end_date,total_price,customer_name,customer_email,customer_phone,status)
  VALUES (?,?,?,?,?,?,?,'pending')
`);
const selectBookingsForAgency = db.prepare(`
  SELECT b.*, c.title AS car_title
  FROM bookings b JOIN cars c ON c.id = b.car_id
  WHERE c.agency_id = ?
  ORDER BY b.created_at DESC
`);

// ---------- routes ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/agency/register', (req, res) => {
  const p = RegisterSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { name, email, password, location, phone } = p.data;

  const exist = getAgencyByEmail.get(email);
  if (exist) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = insertAgency.run(name, email, hash, location, phone);
  const agency = { id: info.lastInsertRowid, name, email, location, phone };
  const token = signToken(agency);
  res.json({ token, agency });
});

app.post('/api/agency/login', (req, res) => {
  const p = LoginSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });

  const { email, password } = p.data;
  const agency = getAgencyByEmail.get(email);
  if (!agency) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, agency.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(agency);
  res.json({ token, agency: { id: agency.id, name: agency.name, email: agency.email, location: agency.location, phone: agency.phone } });
});

// create car
app.post('/api/cars', auth, (req, res) => {
  const p = CarSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data;
  const info = insertCar.run(
    req.user.id,
    d.title, d.brand || null, d.model || null,
    d.year || null, d.transmission || null, d.seats || null, d.doors || null, d.trunk_liters || null, d.fuel_type || null, d.options || null,
    d.daily_price, d.location, d.image_url || null, d.description || null
  );
  res.status(201).json(selectCarById.get(info.lastInsertRowid));
});

// add availability (auth)
app.post('/api/cars/:id/availability', auth, (req, res) => {
  const id = Number(req.params.id);
  const car = selectCarById.get(id);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  if (car.agency_id !== req.user.id) return res.status(403).json({ error: 'Not your car' });

  const p = AvailabilitySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { start_date, end_date } = p.data;

  insertAvail.run(id, start_date, end_date);
  res.json(selectAvailByCar.all(id));
});

// get availability (public)
app.get('/api/cars/:id/availability', (req, res) => {
  const id = Number(req.params.id);
  const car = selectCarById.get(id);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  res.json(selectAvailByCar.all(id));
});

// get single car with agency contact (public)
app.get('/api/cars/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = selectCarWithAgency.get(id);
  if (!row) return res.status(404).json({ error: 'Car not found' });
  res.json(row);
});

// search cars (returns agency name + phone)
app.get('/api/cars', (req, res) => {
  const { location, minPrice, maxPrice, startDate, endDate } = req.query;
  const filters = [];
  const params = [];

  let sql = `
    SELECT DISTINCT c.*,
           ag.name AS agency_name,
           ag.phone AS agency_phone
    FROM cars c
    JOIN agencies ag ON ag.id = c.agency_id
    LEFT JOIN availability a ON a.car_id = c.id
  `;

  if (location) { filters.push('c.location LIKE ?'); params.push('%' + location + '%'); }
  if (minPrice) { filters.push('c.daily_price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice) { filters.push('c.daily_price <= ?'); params.push(Number(maxPrice)); }

  if (filters.length) sql += ' WHERE ' + filters.join(' AND ');

  const useDates = startDate && endDate && isISO(startDate) && isISO(endDate);
  if (useDates) {
    sql += (filters.length ? ' AND ' : ' WHERE ') + 'a.start_date <= ? AND a.end_date >= ?';
    params.push(endDate, startDate);
    sql += ' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.car_id = c.id AND b.status != \'canceled\' AND NOT (b.end_date < ? OR b.start_date > ?))';
    params.push(startDate, endDate);
  }

  sql += ' GROUP BY c.id ORDER BY c.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// create booking (respond with agency contact)
app.post('/api/bookings', (req, res) => {
  const p = BookingSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });

  const { car_id, start_date, end_date, customer_name, customer_email, customer_phone } = p.data;
  const car = selectCarById.get(car_id);
  if (!car) return res.status(404).json({ error: 'Car not found' });

  if (!availableRangeExists.get(car_id, start_date, end_date).ok)
    return res.status(409).json({ error: 'Car not available for the requested dates' });

  if (conflictBookingExists.get(car_id, start_date, end_date).bad)
    return res.status(409).json({ error: 'Car already booked for the requested dates' });

  const days = daysBetween(start_date, end_date);
  if (days <= 0) return res.status(400).json({ error: 'End date must be after start date' });

  const total_price = days * car.daily_price;
  const info = insertBooking.run(car_id, start_date, end_date, total_price, customer_name, customer_email, customer_phone || null);

  const contact = db.prepare(`
    SELECT ag.name AS agency_name, ag.phone AS agency_phone
    FROM cars c JOIN agencies ag ON ag.id = c.agency_id
    WHERE c.id = ?
  `).get(car_id);

  res.status(201).json({
    id: info.lastInsertRowid,
    total_price,
    status: 'pending',
    ...contact
  });
});

// agency bookings
app.get('/api/agency/me/bookings', auth, (req, res) => {
  res.json(selectBookingsForAgency.all(req.user.id));
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

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

-- Agencies (rental companies)
CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cars
CREATE TABLE IF NOT EXISTS cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  daily_price REAL NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
);

-- Availability date ranges for each car
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  start_date TEXT NOT NULL, -- ISO YYYY-MM-DD
  end_date TEXT NOT NULL,   -- ISO YYYY-MM-DD (inclusive)
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_price REAL NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|canceled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cars_location ON cars(location);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(daily_price);
CREATE INDEX IF NOT EXISTS idx_availability_car ON availability(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car ON bookings(car_id);

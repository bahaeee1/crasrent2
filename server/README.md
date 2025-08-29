# Rental Marketplace API (MVP)

## Quick start
```bash
# In the server folder
cp .env.example .env
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default.

## Endpoints (summary)
- `POST /api/agency/register` -> {name, email, password, location}
- `POST /api/agency/login` -> {email, password}
- `POST /api/cars` (auth) -> create car
- `POST /api/cars/:id/availability` (auth) -> add availability range
- `GET  /api/cars/:id/availability` -> list availability for a car
- `GET  /api/cars` -> search (query: location, minPrice, maxPrice, startDate, endDate, minDuration)
- `POST /api/bookings` -> create booking (public)
- `GET  /api/agency/me/bookings` (auth)

Auth uses a Bearer JWT token returned by login/register.

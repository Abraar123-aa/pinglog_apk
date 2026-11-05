# PingLog

React front end (public/index.html) + Node/Express API (server.js).

## Run
    npm install
    npm start
Open http://localhost:3000

Sign in with demo@pinglog.app / pinglog123, any new email + password (6+ chars) to register, or "Continue as guest".
Data is stored in data.json. The front end loads React from cdnjs, so it needs an internet connection.

## API (Bearer token from /api/login)
POST /api/login · POST /api/guest · POST /api/logout
GET /api/tests · POST /api/tests (runs a test)
GET/PUT /api/alerts {thr, alerts} · GET/PUT /api/settings {plan, server}

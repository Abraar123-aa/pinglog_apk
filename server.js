// PingLog API: Express server with file-based storage (data.json)
const express = require("express"), crypto = require("crypto"), fs = require("fs"), path = require("path");
const app = express(), FILE = path.join(__dirname, "data.json"), PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db = { users: {}, sessions: {} };
try { db = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) {}
const save = () => fs.writeFile(FILE, JSON.stringify(db, null, 2), () => {});
const hash = (p, salt) => crypto.scryptSync(p, salt, 32).toString("hex");
const seedTests = () => {
  const n = Date.now(), M = 6e4;
  return [[412, 38, 14, 1], [398, 43, 13, 150], [315, 36, 19, 1380], [384, 39, 15, 1500], [401, 42, 12, 1560]]
    .map((a, i) => ({ id: n - i, t: n - a[3] * M, dl: a[0], ul: a[1], ping: a[2] }));
};
const newUser = (name, extra = {}) => ({
  name, ...extra, tests: seedTests(),
  settings: { plan: 500, server: "Dallas, TX" }, alerts: { thr: 250, alerts: true },
});
const SERVERS = ["Dallas, TX", "Chicago, IL", "Chennai, IN"], PLANS = [100, 300, 500, 1000];
const session = (key) => { const token = crypto.randomBytes(24).toString("hex"); db.sessions[token] = key; save(); return token; };

// Demo account: demo@pinglog.app / pinglog123
if (!db.users["demo@pinglog.app"]) {
  const salt = crypto.randomBytes(8).toString("hex");
  db.users["demo@pinglog.app"] = newUser("demo", { salt, pw: hash("pinglog123", salt) });
  save();
}

const auth = (req, res, next) => {
  const t = (req.headers.authorization || "").replace("Bearer ", ""), key = db.sessions[t];
  if (!key || !db.users[key]) return res.status(401).json({ error: "Please sign in again." });
  req.token = t; req.u = db.users[key]; next();
};

// Sign in. A new email is registered on first sign-in.
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || "")) return res.status(400).json({ error: "Enter a valid email address." });
  if (typeof password !== "string" || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  const key = email.toLowerCase();
  let u = db.users[key];
  if (!u) { const salt = crypto.randomBytes(8).toString("hex"); u = db.users[key] = newUser(key.split("@")[0], { salt, pw: hash(password, salt) }); }
  else if (!crypto.timingSafeEqual(Buffer.from(hash(password, u.salt)), Buffer.from(u.pw)))
    return res.status(401).json({ error: "Wrong email or password." });
  res.json({ token: session(key), name: u.name });
});
app.post("/api/guest", (req, res) => {
  const key = "guest:" + crypto.randomBytes(6).toString("hex");
  db.users[key] = newUser("Guest");
  res.json({ token: session(key), name: "Guest" });
});
app.post("/api/logout", auth, (req, res) => { delete db.sessions[req.token]; save(); res.json({ ok: true }); });

// Tests: POST runs a (simulated) speed test and stores it
app.get("/api/tests", auth, (req, res) => res.json(req.u.tests));
app.post("/api/tests", auth, (req, res) => {
  const test = {
    id: Date.now(), t: Date.now(), dl: Math.round(200 + Math.random() * 270),
    ul: Math.round(30 + Math.random() * 20), ping: Math.round(10 + Math.random() * 10),
  };
  req.u.tests = [test, ...req.u.tests].slice(0, 30); save();
  const a = req.u.alerts;
  res.json({ test, alert: a.alerts && test.dl < a.thr });
});

// Alerts
app.get("/api/alerts", auth, (req, res) => res.json(req.u.alerts));
app.put("/api/alerts", auth, (req, res) => {
  const thr = parseInt(req.body.thr, 10);
  if (!(thr > 0) || typeof req.body.alerts !== "boolean") return res.status(400).json({ error: "Enter a speed above 0 Mbps." });
  req.u.alerts = { thr, alerts: req.body.alerts }; save(); res.json(req.u.alerts);
});

// Settings
app.get("/api/settings", auth, (req, res) => res.json(req.u.settings));
app.put("/api/settings", auth, (req, res) => {
  const { plan, server } = req.body || {};
  if (!PLANS.includes(plan) || !SERVERS.includes(server)) return res.status(400).json({ error: "Invalid plan or server." });
  req.u.settings = { plan, server }; save(); res.json(req.u.settings);
});

app.listen(PORT, () => console.log("PingLog running at http://localhost:" + PORT));

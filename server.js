const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const store = require("./db/store");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-cambiar-en-produccion",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

app.get("/", (req, res) => {
  if (!req.session.userId) return res.redirect("/login.html");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "No autenticado" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.status(403).json({ error: "Solo administradores" });
  }
  next();
}

app.post("/api/auth/register", (req, res) => {
  const { username, fullname, password } = req.body;
  if (!username || !fullname || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: "Usuario minimo 3, contrasena minimo 4" });
  }
  if (store.findUserByUsername(username)) {
    return res.status(409).json({ error: "Ese usuario ya existe" });
  }

  const user = store.createUser({
    username,
    fullname,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "student"
  });
  if (!user) return res.status(409).json({ error: "Ese usuario ya existe" });

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.fullname = user.fullname;
  req.session.role = user.role;

  res.json({ ok: true, user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role } });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Faltan datos" });

  const user = store.findUserByUsername(username);
  if (!user) return res.status(401).json({ error: "Usuario o contrasena incorrectos" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Usuario o contrasena incorrectos" });

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.fullname = user.fullname;
  req.session.role = user.role;

  res.json({ ok: true, user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role } });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "No autenticado" });
  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username,
      fullname: req.session.fullname,
      role: req.session.role
    }
  });
});

app.get("/api/tasks", requireAuth, (req, res) => {
  res.json({ tasks: store.listTasks(req.session.userId) });
});

app.post("/api/tasks", requireAuth, (req, res) => {
  const { title, description, assignee, priority, status } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "El titulo es obligatorio" });

  const task = store.createTask(req.session.userId, {
    title: title.trim(),
    description: (description || "").trim(),
    assignee: (assignee || "").trim(),
    priority: priority || "media",
    status: status || "todo"
  });
  res.status(201).json({ task });
});

app.put("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { title, description, assignee, priority, status } = req.body;
  const updated = store.updateTask(id, req.session.userId, { title, description, assignee, priority, status });
  if (!updated) return res.status(404).json({ error: "Tarea no encontrada" });
  res.json({ task: updated });
});

app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const ok = store.deleteTask(id, req.session.userId);
  if (!ok) return res.status(404).json({ error: "Tarea no encontrada" });
  res.json({ ok: true });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json({ users: store.listUsersAdmin() });
});

app.listen(PORT, () => {
  console.log("Servidor corriendo en http://localhost:" + PORT);
});

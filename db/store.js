const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data.json");

let db = { users: [], tasks: [], nextUserId: 1, nextTaskId: 1 };

function load() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      db.users = db.users || [];
      db.tasks = db.tasks || [];
      db.nextUserId = db.nextUserId || 1;
      db.nextTaskId = db.nextTaskId || 1;
    } catch (e) {
      console.error("Error leyendo data.json, se reinicia:", e.message);
    }
  } else {
    save();
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

load();

// ---------- USUARIOS ----------
function findUserByUsername(username) {
  return db.users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
}

function findUserById(id) {
  return db.users.find(u => u.id === id);
}

function createUser({ username, fullname, passwordHash, role }) {
  if (findUserByUsername(username)) return null;
  const user = {
    id: db.nextUserId++,
    username,
    fullname,
    password_hash: passwordHash,
    role: role || "student",
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  save();
  return user;
}

function listUsersAdmin() {
  return db.users.map(u => ({
    id: u.id,
    username: u.username,
    fullname: u.fullname,
    role: u.role,
    created_at: u.created_at
  }));
}

// ---------- TAREAS ----------
function listTasks(userId) {
  return db.tasks.filter(t => t.user_id === userId);
}

function createTask(userId, { title, description, assignee, priority, status }) {
  const task = {
    id: db.nextTaskId++,
    user_id: userId,
    title,
    description,
    assignee,
    priority,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.tasks.push(task);
  save();
  return task;
}

function updateTask(id, userId, fields) {
  const task = db.tasks.find(t => t.id === id && t.user_id === userId);
  if (!task) return null;
  for (const key of ["title", "description", "assignee", "priority", "status"]) {
    if (fields[key] !== undefined) task[key] = fields[key];
  }
  task.updated_at = new Date().toISOString();
  save();
  return task;
}

function deleteTask(id, userId) {
  const idx = db.tasks.findIndex(t => t.id === id && t.user_id === userId);
  if (idx === -1) return false;
  db.tasks.splice(idx, 1);
  save();
  return true;
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  listUsersAdmin,
  listTasks,
  createTask,
  updateTask,
  deleteTask
};

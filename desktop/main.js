const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('documents'), 'Ecole-App-1', 'data');
const BACKUP_DIR = path.join(app.getPath('documents'), 'Ecole-App-1', 'sauvegardes');
const DB_PATH = path.join(DATA_DIR, 'ecole_app.db');

let SQL;
let db;
let win;

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema() {
  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ENSEIGNANT',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      must_change_code INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, sex TEXT, class TEXT, phone TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, subject TEXT, phone TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student TEXT NOT NULL, amount REAL NOT NULL, type TEXT, date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student TEXT NOT NULL, date TEXT, status TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT, action TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const c = query('SELECT COUNT(*) AS n FROM classes')[0].n;
  if (!Number(c)) {
    ['1ère Primaire','2ème Primaire','3ème Primaire','4ème Primaire','5ème Primaire','6ème Primaire'].forEach(x => {
      db.run('INSERT INTO classes(name) VALUES (?)', [x]);
    });
  }
  const u = query('SELECT COUNT(*) AS n FROM users')[0].n;
  if (!Number(u)) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('1234', 12);
    db.run('INSERT INTO users(username,password_hash,role,must_change_code) VALUES (?,?,?,?,?)',
      ['admin', hash, 'ADMIN', 1]);
  }
  saveDb();
}

async function openDatabase() {
  ensureDirs();
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs({ locateFile: f => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) });
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
  } else {
    db = new SQL.Database();
  }
  initSchema();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1050, minHeight: 700,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('auth:login', (_, {username, code}) => {
  const user = query('SELECT * FROM users WHERE username=? AND status="ACTIVE"', [username.trim()])[0];
  if (!user) return {ok:false, message:'Identifiant ou code incorrect.'};
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(code, user.password_hash)) return {ok:false, message:'Identifiant ou code incorrect.'};
  run('INSERT INTO activity_log(username,action) VALUES (?,?)', [user.username,'Connexion']);
  return {ok:true, user:{id:user.id, username:user.username, role:user.role, mustChangeCode:!!user.must_change_code}};
});

ipcMain.handle('auth:changeCode', (_, {userId, oldCode, newCode}) => {
  const user = query('SELECT * FROM users WHERE id=? AND status="ACTIVE"', [userId])[0];
  if (!user || newCode.length < 4) return {ok:false,message:'Code invalide (minimum 4 caractères).'};
  const bcrypt = require('bcryptjs');
  if (!bcrypt.compareSync(oldCode, user.password_hash)) return {ok:false,message:'Ancien code incorrect.'};
  const hash = bcrypt.hashSync(newCode, 12);
  run('UPDATE users SET password_hash=?,must_change_code=0,updated_at=CURRENT_TIMESTAMP WHERE id=?',[hash,userId]);
  return {ok:true};
});

ipcMain.handle('data:list', (_, table) => {
  const allowed = ['students','teachers','classes','payments','attendance','users'];
  if (!allowed.includes(table)) throw new Error('Table interdite');
  if (table === 'users') return query('SELECT id,username,role,status,created_at FROM users ORDER BY id DESC');
  return query('SELECT * FROM '+table+' ORDER BY id DESC');
});

ipcMain.handle('data:add', (_, {table, values}) => {
  const maps = {
    students:['name','sex','class','phone'],
    teachers:['name','subject','phone'],
    classes:['name'],
    payments:['student','amount','type','date'],
    attendance:['student','date','status']
  };
  if (!maps[table]) throw new Error('Table interdite');
  const cols = maps[table];
  const sql = 'INSERT INTO '+table+'('+cols.join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')';
  run(sql, cols.map(k=>values[k]));
  return {ok:true};
});

ipcMain.handle('data:delete', (_, {table,id}) => {
  if (!['students','teachers','classes','payments','attendance'].includes(table)) throw new Error('Suppression interdite');
  run('DELETE FROM '+table+' WHERE id=?',[id]);
  return {ok:true};
});

ipcMain.handle('users:create', (_, {username, code, role}) => {
  if (!username || !code || code.length < 4) return {ok:false,message:'Identifiant et code (4 caractères minimum) requis.'};
  const bcrypt = require('bcryptjs');
  try {
    run('INSERT INTO users(username,password_hash,role,must_change_code) VALUES (?,?,?,1)',
      [username.trim(),bcrypt.hashSync(code,12),role || 'ENSEIGNANT']);
    return {ok:true};
  } catch(e) { return {ok:false,message:'Cet identifiant existe déjà.'}; }
});

ipcMain.handle('users:setStatus', (_, {id,status}) => {
  run('UPDATE users SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[status,id]);
  return {ok:true};
});

ipcMain.handle('users:resetCode', (_, {id,code}) => {
  if (!code || code.length < 4) return {ok:false,message:'Code minimum 4 caractères.'};
  const bcrypt = require('bcryptjs');
  run('UPDATE users SET password_hash=?,must_change_code=1,updated_at=CURRENT_TIMESTAMP WHERE id=?',[bcrypt.hashSync(code,12),id]);
  return {ok:true};
});

ipcMain.handle('backup:create', () => {
  saveDb();
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const dest = path.join(BACKUP_DIR, 'ecole_app_'+stamp+'.db');
  fs.copyFileSync(DB_PATH,dest);
  return {ok:true,path:dest};
});

ipcMain.handle('backup:restore', async () => {
  const r = await dialog.showOpenDialog(win,{title:'Restaurer une sauvegarde',defaultPath:BACKUP_DIR,filters:[{name:'Base SQLite',extensions:['db']}],properties:['openFile']});
  if (r.canceled || !r.filePaths[0]) return {ok:false};
  const source=r.filePaths[0];
  try {
    const bytes=new Uint8Array(fs.readFileSync(source));
    const test=new SQL.Database(bytes);
    test.exec('SELECT name FROM sqlite_master LIMIT 1');
    test.close();
    fs.copyFileSync(source,DB_PATH);
    db.close();
    db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));
    initSchema();
    return {ok:true};
  } catch(e) { return {ok:false,message:'Sauvegarde SQLite invalide.'}; }
});

ipcMain.handle('app:info',()=>({dbPath:DB_PATH,backupDir:BACKUP_DIR}));

app.whenReady().then(async()=>{await openDatabase();createWindow();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

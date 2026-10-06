const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'Ecole-App-1';
const ROOT = path.join(app.getPath('documents'), APP_NAME);
const DATA_DIR = path.join(ROOT, 'data');
const BACKUP_DIR = path.join(ROOT, 'sauvegardes');
const EXPORT_DIR = path.join(ROOT, 'exports');
const DOC_DIR = path.join(ROOT, 'documents');
const PHOTO_DIR = path.join(ROOT, 'photos');
const DB_PATH = path.join(DATA_DIR, 'ecole_app.db');
const LOG_PATH = path.join(ROOT, 'logs.txt');

let SQL, db, win;

function logError(error) {
  try {
    fs.mkdirSync(ROOT, { recursive: true });
    fs.appendFileSync(LOG_PATH, '[' + new Date().toISOString() + '] ' + (error?.stack || error) + '\n');
  } catch (_) {}
}
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

function dirs() {
  [ROOT, DATA_DIR, BACKUP_DIR, EXPORT_DIR, DOC_DIR, PHOTO_DIR].forEach(d => fs.mkdirSync(d, {recursive:true}));
}
function q(sql, params=[]) {
  const st=db.prepare(sql); st.bind(params); const out=[];
  while(st.step()) out.push(st.getAsObject()); st.free(); return out;
}
function one(sql, params=[]) { return q(sql,params)[0] || null; }
function save() { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
function run(sql, params=[]) { const st=db.prepare(sql); st.bind(params); st.step(); st.free(); save(); }

const schema = \`
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),school_name TEXT,logo TEXT,address TEXT,phone TEXT,email TEXT,website TEXT,currency TEXT DEFAULT 'USD',slogan TEXT,active_year_id INTEGER);
CREATE TABLE IF NOT EXISTS academic_years(id INTEGER PRIMARY KEY AUTOINCREMENT,label TEXT UNIQUE NOT NULL,status TEXT DEFAULT 'OPEN',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS levels(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS sections(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS options(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS rooms(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL,level_id INTEGER,section_id INTEGER,option_id INTEGER,room_id INTEGER,year_id INTEGER,status TEXT DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS parents(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,address TEXT,occupation TEXT);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,matricule TEXT UNIQUE,name TEXT NOT NULL,postname TEXT,firstname TEXT,sex TEXT,birth_date TEXT,birth_place TEXT,nationality TEXT,address TEXT,phone TEXT,photo TEXT,status TEXT DEFAULT 'ACTIVE',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,year_id INTEGER,class_id INTEGER,enroll_date TEXT,status TEXT DEFAULT 'ACTIVE',old_school TEXT,file_number TEXT,observation TEXT,UNIQUE(student_id,year_id),FOREIGN KEY(student_id) REFERENCES students(id),FOREIGN KEY(year_id) REFERENCES academic_years(id),FOREIGN KEY(class_id) REFERENCES classes(id));
CREATE TABLE IF NOT EXISTS student_parents(student_id INTEGER,parent_id INTEGER,relation TEXT,PRIMARY KEY(student_id,parent_id),FOREIGN KEY(student_id) REFERENCES students(id),FOREIGN KEY(parent_id) REFERENCES parents(id));
CREATE TABLE IF NOT EXISTS teachers(id INTEGER PRIMARY KEY AUTOINCREMENT,matricule TEXT UNIQUE,name TEXT NOT NULL,subject TEXT,phone TEXT,email TEXT,address TEXT,status TEXT DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS staff(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,job TEXT,phone TEXT,email TEXT,status TEXT DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,name TEXT NOT NULL,coefficient REAL DEFAULT 1,level TEXT,volume_hours REAL,description TEXT);
CREATE TABLE IF NOT EXISTS assignments(id INTEGER PRIMARY KEY AUTOINCREMENT,teacher_id INTEGER,subject_id INTEGER,class_id INTEGER,year_id INTEGER,status TEXT DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS schedules(id INTEGER PRIMARY KEY AUTOINCREMENT,class_id INTEGER,teacher_id INTEGER,subject_id INTEGER,room_id INTEGER,day TEXT,start_time TEXT,end_time TEXT);
CREATE TABLE IF NOT EXISTS student_attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,class_id INTEGER,date TEXT,time TEXT,status TEXT,motif TEXT,observation TEXT,user_id INTEGER);
CREATE TABLE IF NOT EXISTS teacher_attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,teacher_id INTEGER,date TEXT,time TEXT,status TEXT,motif TEXT,user_id INTEGER);
CREATE TABLE IF NOT EXISTS periods(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,year_id INTEGER,start_date TEXT,end_date TEXT,status TEXT DEFAULT 'OPEN');
CREATE TABLE IF NOT EXISTS evaluations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,type TEXT,subject_id INTEGER,class_id INTEGER,period_id INTEGER,date TEXT,max_score REAL DEFAULT 20,coefficient REAL DEFAULT 1);
CREATE TABLE IF NOT EXISTS grades(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,evaluation_id INTEGER,score REAL,appreciation TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(student_id,evaluation_id));
CREATE TABLE IF NOT EXISTS fee_types(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE NOT NULL,amount REAL DEFAULT 0,year_id INTEGER,due_date TEXT,status TEXT DEFAULT 'ACTIVE');
CREATE TABLE IF NOT EXISTS student_fees(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,fee_type_id INTEGER,amount_due REAL,discount REAL DEFAULT 0,due_date TEXT,status TEXT DEFAULT 'OPEN',UNIQUE(student_id,fee_type_id));
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,fee_type_id INTEGER,amount REAL NOT NULL,date TEXT,receipt_no TEXT UNIQUE,method TEXT,cashier TEXT,observation TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER,type TEXT,title TEXT,file_path TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,title TEXT,message TEXT,read_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'ENSEIGNANT',status TEXT NOT NULL DEFAULT 'ACTIVE',must_change_code INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT,action TEXT,entity TEXT,entity_id INTEGER,details TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS imports(id INTEGER PRIMARY KEY AUTOINCREMENT,filename TEXT,rows_count INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
\`;

function init() {
  db.run(schema);
  if (!one('SELECT id FROM settings WHERE id=1')) db.run("INSERT INTO settings(id,school_name,currency) VALUES(1,'Établissement scolaire','USD')");
  if (!one('SELECT id FROM academic_years LIMIT 1')) db.run("INSERT INTO academic_years(label,status) VALUES('2026-2027','ACTIVE')");
  if (!one('SELECT id FROM levels LIMIT 1')) ['Maternelle','Primaire','Secondaire'].forEach(x=>db.run('INSERT INTO levels(name) VALUES(?)',[x]));
  if (!one('SELECT id FROM sections LIMIT 1')) ['Générale','Technique','Professionnelle'].forEach(x=>db.run('INSERT INTO sections(name) VALUES(?)',[x]));
  if (!one('SELECT id FROM options LIMIT 1')) ['Sans option','Scientifique','Littéraire','Commerciale'].forEach(x=>db.run('INSERT INTO options(name) VALUES(?)',[x]));
  if (!one('SELECT id FROM rooms LIMIT 1')) ['Salle 1','Salle 2','Salle 3'].forEach(x=>db.run('INSERT INTO rooms(name) VALUES(?)',[x]));
  if (!one('SELECT id FROM classes LIMIT 1')) ['1ère Primaire','2ème Primaire','3ème Primaire','4ème Primaire','5ème Primaire','6ème Primaire'].forEach(x=>db.run('INSERT INTO classes(name,status) VALUES(?,?)',[x,'ACTIVE']));
  if (!one('SELECT id FROM fee_types LIMIT 1')) ['Inscription','Minerval','Frais pédagogiques','Uniforme','Bibliothèque','Informatique','Examen','Transport','Cantine','Activités','Autres'].forEach(x=>db.run('INSERT INTO fee_types(name) VALUES(?)',[x]));
  if (!one('SELECT id FROM users LIMIT 1')) {
    const bcrypt=require('bcryptjs');
    db.run('INSERT INTO users(username,password_hash,role,must_change_code) VALUES(?,?,?,1)',[
      'admin',bcrypt.hashSync('1234',12),'ADMIN'
    ]);
  }
  save();
}

async function openDB() {
  dirs();
  const initSqlJs=require('sql.js');
  const wasm = app.isPackaged
    ? path.join(process.resourcesPath,'app.asar.unpacked','node_modules','sql.js','dist','sql-wasm.wasm')
    : path.join(__dirname,'node_modules','sql.js','dist','sql-wasm.wasm');
  SQL=await initSqlJs({locateFile:()=>wasm});
  db=fs.existsSync(DB_PATH) ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH))) : new SQL.Database();
  init();
}

function createWindow() {
  win=new BrowserWindow({
    width:1500,height:940,minWidth:1100,minHeight:720,show:false,
    backgroundColor:'#f4f7fb',
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}
  });
  win.loadFile(path.join(__dirname,'index.html'));
  win.once('ready-to-show',()=>win.show());
  win.webContents.on('render-process-gone',(_,d)=>logError('Renderer: '+JSON.stringify(d)));
}

function audit(username,action,entity='',id=null,details='') {
  db.run('INSERT INTO activity_log(username,action,entity,entity_id,details) VALUES(?,?,?,?,?)',[username,action,entity,id,details]); save();
}

const TABLES={
 students:{title:'Élèves',table:'students',fields:[
  ['matricule','Matricule'],['name','Nom'],['postname','Postnom'],['firstname','Prénom'],['sex','Sexe'],['birth_date','Date naissance'],['birth_place','Lieu naissance'],['nationality','Nationalité'],['address','Adresse'],['phone','Téléphone'],['status','Statut']]},
 parents:{title:'Parents',table:'parents',fields:[['name','Nom complet'],['phone','Téléphone'],['email','Email'],['address','Adresse'],['occupation','Profession']]},
 teachers:{title:'Enseignants',table:'teachers',fields:[['matricule','Matricule'],['name','Nom'],['subject','Matière principale'],['phone','Téléphone'],['email','Email'],['address','Adresse'],['status','Statut']]},
 staff:{title:'Personnel',table:'staff',fields:[['name','Nom complet'],['job','Fonction'],['phone','Téléphone'],['email','Email'],['status','Statut']]},
 classes:{title:'Classes',table:'classes',fields:[['name','Classe'],['level_id','Niveau'],['section_id','Section'],['option_id','Option'],['room_id','Salle'],['year_id','Année'],['status','Statut']]},
 levels:{title:'Niveaux',table:'levels',fields:[['name','Nom']]},
 sections:{title:'Sections',table:'sections',fields:[['name','Nom']]},
 options:{title:'Options',table:'options',fields:[['name','Nom']]},
 rooms:{title:'Salles',table:'rooms',fields:[['name','Nom']]},
 subjects:{title:'Matières',table:'subjects',fields:[['code','Code'],['name','Matière'],['coefficient','Coefficient'],['level','Niveau'],['volume_hours','Volume horaire'],['description','Description']]},
 academic_years:{title:'Années scolaires',table:'academic_years',fields:[['label','Année'],['status','Statut']]},
 fee_types:{title:'Types de frais',table:'fee_types',fields:[['name','Frais'],['amount','Montant'],['year_id','Année'],['due_date','Échéance'],['status','Statut']]},
 payments:{title:'Paiements',table:'payments',fields:[['student_id','Élève'],['fee_type_id','Frais'],['amount','Montant'],['date','Date'],['receipt_no','N° reçu'],['method','Mode'],['cashier','Caissier'],['observation','Observation']]},
 student_attendance:{title:'Présences élèves',table:'student_attendance',fields:[['student_id','Élève'],['class_id','Classe'],['date','Date'],['time','Heure'],['status','Statut'],['motif','Motif'],['observation','Observation']]},
 teacher_attendance:{title:'Présences enseignants',table:'teacher_attendance',fields:[['teacher_id','Enseignant'],['date','Date'],['time','Heure'],['status','Statut'],['motif','Motif']]},
 periods:{title:'Périodes',table:'periods',fields:[['name','Période'],['year_id','Année'],['start_date','Début'],['end_date','Fin'],['status','Statut']]},
 evaluations:{title:'Évaluations',table:'evaluations',fields:[['name','Évaluation'],['type','Type'],['subject_id','Matière'],['class_id','Classe'],['period_id','Période'],['date','Date'],['max_score','Maximum'],['coefficient','Coefficient']]},
 grades:{title:'Notes',table:'grades',fields:[['student_id','Élève'],['evaluation_id','Évaluation'],['score','Note'],['appreciation','Appréciation']]},
 schedules:{title:'Horaires',table:'schedules',fields:[['class_id','Classe'],['teacher_id','Enseignant'],['subject_id','Matière'],['room_id','Salle'],['day','Jour'],['start_time','Début'],['end_time','Fin']]},
 assignments:{title:'Affectations',table:'assignments',fields:[['teacher_id','Enseignant'],['subject_id','Matière'],['class_id','Classe'],['year_id','Année'],['status','Statut']]}
};

function listTable(table, search='') {
  if(!TABLES[table] && !['users','documents','activity_log','enrollments','student_fees'].includes(table)) throw new Error('Table interdite');
  let rows=q('SELECT * FROM '+table+' ORDER BY id DESC');
  if(search) {
    const s=search.toLowerCase();
    rows=rows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(s)));
  }
  return rows;
}

ipcMain.handle('app:info',()=>({appName:APP_NAME,dbPath:DB_PATH,root:ROOT,backupDir:BACKUP_DIR,exportDir:EXPORT_DIR,version:app.getVersion()}));
ipcMain.handle('auth:login',(_,d)=>{
  const u=one('SELECT * FROM users WHERE username=? AND status="ACTIVE"',[String(d.username||'').trim()]);
  if(!u) return {ok:false,message:'Identifiant ou code incorrect.'};
  const bcrypt=require('bcryptjs');
  if(!bcrypt.compareSync(String(d.code||''),u.password_hash)) return {ok:false,message:'Identifiant ou code incorrect.'};
  audit(u.username,'Connexion','users',u.id,'Connexion réussie');
  return {ok:true,user:{id:u.id,username:u.username,role:u.role,mustChangeCode:!!u.must_change_code}};
});
ipcMain.handle('auth:changeCode',(_,d)=>{
  const u=one('SELECT * FROM users WHERE id=? AND status="ACTIVE"',[d.userId]);
  if(!u||String(d.newCode||'').length<4) return {ok:false,message:'Code invalide (minimum 4 caractères).'};
  const bcrypt=require('bcryptjs');
  if(!bcrypt.compareSync(String(d.oldCode||''),u.password_hash)) return {ok:false,message:'Ancien code incorrect.'};
  run('UPDATE users SET password_hash=?,must_change_code=0,updated_at=CURRENT_TIMESTAMP WHERE id=?',[bcrypt.hashSync(d.newCode,12),u.id]);
  audit(u.username,'Modification code','users',u.id); return {ok:true};
});
ipcMain.handle('data:list',(_,d)=>listTable(d.table,d.search||''));
ipcMain.handle('data:options',(_,table)=>{
  const maps={students:['students','id',"COALESCE(matricule||' - ','')||name||' '||COALESCE(firstname,'')"],teachers:['teachers','id','name'],classes:['classes','id','name'],subjects:['subjects','id',"code||' - '||name"],academic_years:['academic_years','id','label'],fee_types:['fee_types','id','name'],periods:['periods','id','name'],evaluations:['evaluations','id','name'],levels:['levels','id','name'],sections:['sections','id','name'],options:['options','id','name'],rooms:['rooms','id','name']};
  const m=maps[table]; if(!m)return[]; return q('SELECT '+m[1]+' id,'+m[2]+' label FROM '+m[0]+' ORDER BY label');
});
ipcMain.handle('data:add',(_,d)=>{
  const cfg=TABLES[d.table]; if(!cfg) throw new Error('Table interdite');
  const cols=cfg.fields.map(x=>x[0]); const vals=cols.map(c=>d.values?.[c]??'');
  run('INSERT INTO '+cfg.table+'('+cols.join(',')+') VALUES('+cols.map(()=>'?').join(',')+')',vals);
  return {ok:true};
});
ipcMain.handle('data:update',(_,d)=>{
  const cfg=TABLES[d.table]; if(!cfg) throw new Error('Table interdite');
  const cols=cfg.fields.map(x=>x[0]); const vals=cols.map(c=>d.values?.[c]??''); run('UPDATE '+cfg.table+' SET '+cols.map(c=>c+'=?').join(',')+' WHERE id=?',[...vals,d.id]); return {ok:true};
});
ipcMain.handle('data:delete',(_,d)=>{
  const cfg=TABLES[d.table]; if(!cfg) throw new Error('Table interdite');
  run('UPDATE '+cfg.table+' SET status="ARCHIVED" WHERE id=?',[d.id]); return {ok:true};
});
ipcMain.handle('users:list',()=>q('SELECT id,username,role,status,must_change_code,created_at FROM users ORDER BY id DESC'));
ipcMain.handle('users:create',(_,d)=>{
  if(!d.username||String(d.code||'').length<4)return{ok:false,message:'Identifiant et code (4 caractères minimum) requis.'};
  const bcrypt=require('bcryptjs'); try{run('INSERT INTO users(username,password_hash,role,must_change_code) VALUES(?,?,?,1)',[d.username.trim(),bcrypt.hashSync(d.code,12),d.role||'ENSEIGNANT']);return{ok:true};}catch(e){return{ok:false,message:'Cet identifiant existe déjà.'}};
});
ipcMain.handle('users:status',(_,d)=>{run('UPDATE users SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',[d.status,d.id]);return{ok:true};});
ipcMain.handle('users:reset',(_,d)=>{if(String(d.code||'').length<4)return{ok:false,message:'Code minimum 4 caractères.'};const b=require('bcryptjs');run('UPDATE users SET password_hash=?,must_change_code=1,updated_at=CURRENT_TIMESTAMP WHERE id=?',[b.hashSync(d.code,12),d.id]);return{ok:true};});
ipcMain.handle('dashboard',()=>{
  const count=t=>Number(one('SELECT COUNT(*) n FROM '+t)?.n||0);
  const revenue=Number(one('SELECT COALESCE(SUM(amount),0) n FROM payments')?.n||0);
  const present=Number(one("SELECT COUNT(*) n FROM student_attendance WHERE status='PRESENT'")?.n||0);
  const att=Number(one("SELECT COUNT(*) n FROM student_attendance")?.n||0);
  return {students:count('students'),teachers:count('teachers'),classes:count('classes'),payments:count('payments'),revenue,presenceRate:att?Math.round(present*100/att):0};
});
ipcMain.handle('backup:create',()=>{
  save(); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const dest=path.join(BACKUP_DIR,'ecole_app_'+stamp+'.db'); fs.copyFileSync(DB_PATH,dest); return{ok:true,path:dest};
});
ipcMain.handle('backup:restore',async()=>{
  const r=await dialog.showOpenDialog(win,{title:'Restaurer une sauvegarde',defaultPath:BACKUP_DIR,filters:[{name:'SQLite',extensions:['db']}],properties:['openFile']});
  if(r.canceled)return{ok:false}; try{const src=r.filePaths[0];const test=new SQL.Database(new Uint8Array(fs.readFileSync(src)));test.exec('SELECT name FROM sqlite_master LIMIT 1');test.close();save();fs.copyFileSync(DB_PATH,src);db.close();db=new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)));init();return{ok:true};}catch(e){logError(e);return{ok:false,message:'Sauvegarde SQLite invalide.'}};
});
ipcMain.handle('export:csv',(_,d)=>{
  const rows=listTable(d.table,d.search||''); const headers=rows.length?Object.keys(rows[0]):(TABLES[d.table]?.fields.map(x=>x[0])||[]);
  const csv=[headers.join(';'),...rows.map(r=>headers.map(h=>('"'+String(r[h]??'').replace(/"/g,'""')+'"')).join(';'))].join('\r\n');
  const file=path.join(EXPORT_DIR,(d.table||'export')+'_'+Date.now()+'.csv');fs.writeFileSync(file,'\ufeff'+csv,'utf8');return{ok:true,path:file};
});
ipcMain.handle('print:html',async(_,html)=>{const p=await new Promise(resolve=>{const w=new BrowserWindow({show:false,webPreferences:{sandbox:true}});w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));w.webContents.on('did-finish-load',()=>w.webContents.print({silent:false,printBackground:true},()=>{w.close();resolve(true)}));});return{ok:p};});

app.whenReady().then(async()=>{try{await openDB();createWindow();}catch(e){logError(e);await dialog.showMessageBox({type:'error',title:APP_NAME+' - Erreur de démarrage',message:'L’application n’a pas pu démarrer.',detail:String(e?.stack||e)});app.quit();}});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

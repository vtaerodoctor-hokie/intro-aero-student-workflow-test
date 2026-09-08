import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export const hash=v=>createHash('sha256').update(v).digest('hex');
export function encrypt(value,secret){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(hash(secret),'hex'),iv);return Buffer.concat([iv,c.update(value,'utf8'),c.final(),c.getAuthTag()]).toString('base64');}
export function decrypt(value,secret){const b=Buffer.from(value,'base64'),c=createDecipheriv('aes-256-gcm',Buffer.from(hash(secret),'hex'),b.subarray(0,12));c.setAuthTag(b.subarray(-16));return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString('utf8');}
export class Store{
 constructor(file){this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS students(repo TEXT PRIMARY KEY,login TEXT NOT NULL,token TEXT NOT NULL,revision TEXT,data TEXT,lastSync TEXT,error TEXT);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,login TEXT,access TEXT,expires INTEGER);CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,repo TEXT,mission TEXT,body TEXT,kind TEXT,snapshot TEXT,created TEXT);CREATE TABLE IF NOT EXISTS connections(token TEXT PRIMARY KEY,login TEXT,expires INTEGER);CREATE TABLE IF NOT EXISTS deliveries(id TEXT PRIMARY KEY);`);}
 students(){return this.db.prepare('SELECT repo,login,revision,data,lastSync,error FROM students').all().map(s=>({...s,data:JSON.parse(s.data||'{}')}));}
 session(token){return this.db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token),Date.now());}
 createSession(login,access){const token=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),login,access,Date.now()+24*3600000);return token;}
 connection(token){return this.db.prepare('SELECT login FROM connections WHERE token=? AND expires>?').get(hash(token),Date.now());}
 createConnection(login){const token=randomBytes(32).toString('hex');this.db.prepare('INSERT INTO connections VALUES(?,?,?)').run(hash(token),login,Date.now()+24*3600000);return token;}
 messages(repo){return this.db.prepare("SELECT id,mission,body,kind,snapshot,created FROM feedback WHERE repo=? OR repo='*' ORDER BY id DESC LIMIT 100").all(repo);}
 close(){this.db.close();}
}

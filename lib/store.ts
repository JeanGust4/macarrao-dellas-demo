import { createClient, type Client, type Transaction } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { initialCatalog, productImage, type Catalog } from './catalog';
import { canTransition, priceOrder, type PricedOrder, type Status } from './validation';
let client:Client|undefined,ready:Promise<void>|undefined;
export function demoMode(){return process.env.DEMO_MODE==='true';}
export async function db() {
  if(!client){
    if(process.env.VERCEL&&!process.env.TURSO_DATABASE_URL)throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN na Vercel.');
    if(!process.env.TURSO_DATABASE_URL)mkdirSync('data',{recursive:true});
    client=createClient({url:process.env.TURSO_DATABASE_URL||'file:data/dellas.db',authToken:process.env.TURSO_AUTH_TOKEN});
  }
  ready??=(async()=>{await client!.batch([
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS orders (code INTEGER PRIMARY KEY AUTOINCREMENT,token TEXT NOT NULL UNIQUE,idempotency TEXT NOT NULL UNIQUE,status TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,source TEXT NOT NULL DEFAULT 'site')`,
    `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY,order_code INTEGER,actor TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,order_code INTEGER,phone TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL,provider_id TEXT,created_at TEXT NOT NULL,error TEXT,attempts INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY,phone TEXT NOT NULL,body TEXT NOT NULL,reply TEXT,created_at TEXT NOT NULL,handoff INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL)`,
    {sql:`INSERT OR IGNORE INTO settings (key,value) VALUES ('catalog',?)`,args:[JSON.stringify({...initialCatalog,override:demoMode()?'open':'auto'})]}
  ],'write');})();
  try{await ready;}catch(e){ready=undefined;throw e;}
  return client;
}
export async function getCatalog():Promise<Catalog>{const d=await db();const r=await d.execute("SELECT value FROM settings WHERE key='catalog'");const catalog:Catalog=JSON.parse(String(r.rows[0].value));catalog.products=catalog.products.map(p=>({...p,image:productImage(p)}));return catalog;}
export async function saveCatalog(catalog:Catalog,actor:string){const d=await db();await d.batch([{sql:"UPDATE settings SET value=? WHERE key='catalog'",args:[JSON.stringify(catalog)]},{sql:'INSERT INTO events VALUES (?,NULL,?,?,?)',args:[randomUUID(),actor,'Catálogo atualizado',new Date().toISOString()]}],'write');}
export type Order=PricedOrder&{orderCode:number;trackingToken:string;status:Status;date:string;statusUpdatedAt:string;source:string};
function parseOrder(r:Record<string,unknown>):Order{return {...JSON.parse(String(r.payload)),orderCode:Number(r.code),trackingToken:String(r.token),status:r.status as Status,date:String(r.created_at),statusUpdatedAt:String(r.updated_at),source:String(r.source)};}
export async function listOrders(){const d=await db();const r=await d.execute('SELECT * FROM orders ORDER BY code DESC LIMIT 300');return r.rows.map(parseOrder);}
export async function findOrder(token:string){const d=await db();const r=await d.execute({sql:'SELECT * FROM orders WHERE token=?',args:[token]});return r.rows[0]?parseOrder(r.rows[0]):null;}
export async function addEvent(tx:Transaction,code:number,actor:string,action:string){await tx.execute({sql:'INSERT INTO events VALUES (?,?,?,?,?)',args:[randomUUID(),code,actor,action,new Date().toISOString()]});}
export async function enqueue(tx:Transaction,order:Order,body:string){if(!order.consent)return;await tx.execute({sql:'INSERT INTO messages (id,order_code,phone,body,state,created_at) VALUES (?,?,?,?,?,?)',args:[randomUUID(),order.orderCode,order.customerPhone,body,demoMode()?'simulated':'queued',new Date().toISOString()]});}
export async function createOrder(input:unknown,key:string){
  const d=await db(),tx=await d.transaction('write');
  try{
    const old=await tx.execute({sql:'SELECT * FROM orders WHERE idempotency=?',args:[key]});
    if(old.rows[0]){await tx.commit();return {order:parseOrder(old.rows[0]),repeated:true};}
    const r=await tx.execute("SELECT value FROM settings WHERE key='catalog'");
    const payload=priceOrder(input,JSON.parse(String(r.rows[0].value)));
    const token=randomBytes(32).toString('hex'),now=new Date().toISOString();
    const row=await tx.execute({sql:"INSERT INTO orders (token,idempotency,status,payload,created_at,updated_at) VALUES (?,?,'Pendente',?,?,?) RETURNING *",args:[token,key,JSON.stringify(payload),now,now]});
    const order=parseOrder(row.rows[0]);
    await addEvent(tx,order.orderCode,'cliente','Pedido recebido');
    await enqueue(tx,order,`Olá, ${order.customer}! Recebemos seu pedido #${order.orderCode}. Aguarde o aceite da equipe. Acompanhe pelo link exibido no site.`);
    await tx.commit();return {order,repeated:false};
  }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function transition(token:string,status:Status,actor:string){
  const d=await db(),tx=await d.transaction('write');
  try{const r=await tx.execute({sql:'SELECT * FROM orders WHERE token=?',args:[token]});if(!r.rows[0])throw new Error('Pedido não encontrado.');const order=parseOrder(r.rows[0]);
    if(!canTransition(order.status,status,order.method))throw new Error('Esta mudança de status não é permitida. Atualize a fila.');
    await tx.execute({sql:'UPDATE orders SET status=?,updated_at=? WHERE token=?',args:[status,new Date().toISOString(),token]});
    await addEvent(tx,order.orderCode,actor,`Status: ${order.status} → ${status}`);
    await enqueue(tx,order,`Pedido #${order.orderCode}: ${status}. Equipe Macarrão Dellas.`);
    await tx.commit();return {...order,status};
  }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function rateLimit(key:string,max:number,window=900000){const d=await db(),now=Date.now();const r=await d.execute({sql:`INSERT INTO limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count`,args:[key,now+window,now,now]});return Number(r.rows[0].count)<=max;}
export async function operationData(){const d=await db();const [orders,messages,events,inbox]=await Promise.all([listOrders(),d.execute('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100'),d.execute('SELECT * FROM events ORDER BY created_at DESC LIMIT 100'),d.execute('SELECT * FROM inbox ORDER BY created_at DESC LIMIT 50')]);return {orders,messages:messages.rows,events:events.rows,inbox:inbox.rows};}
export async function seedDemo(actor:string){
  if(!demoMode())throw new Error('Dados de exemplo disponíveis apenas no modo demonstração.');
  const d=await db(),tx=await d.transaction('write');
  try{const existing=await tx.execute("SELECT value FROM settings WHERE key='demo_seeded'");if(existing.rows.length){await tx.commit();return;}
    for(const [i,name] of ['Marina (exemplo)','Lucas (exemplo)','Ana (exemplo)','Pedro (exemplo)','Juliana (exemplo)'].entries()){
      const raw={customer:name,customerPhone:'85999990000',method:i===2?'Retirada':'Entrega',address:'Rua de demonstração',addressNumber:'100',neighborhood:'Renascer',payment:'Pix',consent:true,items:[{productId:'p'+i,quantity:i===1?2:1,pasta:'Talharim',sauce:'Branco'}]};
      const catalog=await tx.execute("SELECT value FROM settings WHERE key='catalog'");const payload=priceOrder(raw,{...JSON.parse(String(catalog.rows[0].value)),override:'open'});
      const status=['Pendente','Aceito','Em preparo','Saiu para entrega','Finalizado'][i],now=new Date(Date.now()-(i+1)*7*60000).toISOString();
      const r=await tx.execute({sql:'INSERT INTO orders (token,idempotency,status,payload,created_at,updated_at,source) VALUES (?,?,?,?,?,?,?) RETURNING *',args:[randomBytes(32).toString('hex'),'seed-'+i,status,JSON.stringify(payload),now,now,'exemplo']});
      const order=parseOrder(r.rows[0]);await addEvent(tx,order.orderCode,actor,'Pedido fictício para apresentação');await enqueue(tx,order,`Pedido de exemplo #${order.orderCode}: ${status}. Nenhuma mensagem foi enviada.`);
    }
    await tx.execute("INSERT INTO settings VALUES ('demo_seeded','true')");await tx.commit();
  }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}

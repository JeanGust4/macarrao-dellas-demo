import { z } from 'zod';
import { configured,cookieName,manager,sameOrigin,session,verifyPassword } from '@/lib/auth';
import { businessStatus } from '@/lib/catalog';
import { createOrder, db, demoMode, findOrder, getCatalog, operationData, rateLimit, saveCatalog, seedDemo, transition } from '@/lib/store';
import { statuses } from '@/lib/validation';
import { askAgent } from '@/lib/agent';
import { customerAssistant } from '@/lib/customer-assistant';
import { processMessages, receiveWebhook, simulateInbound, validSignature } from '@/lib/whatsapp';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{path:string[]}>};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function body(request:Request){const raw=await request.text();if(raw.length>100000)throw new Error('Conteúdo muito grande.');return JSON.parse(raw);}
async function handler(request:Request,ctx:Ctx){try{
  const {path}=await ctx.params,route=path.join('/'),method=request.method,url=new URL(request.url);
  if(route==='health')return json({ok:true,demo:demoMode()});
  if(route==='whatsapp/webhook'){
    if(method==='GET'){if(process.env.WHATSAPP_VERIFY_TOKEN&&url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN)return new Response(url.searchParams.get('hub.challenge'));return json({error:'Verificação inválida.'},403);}
    if(method==='POST'){const raw=await request.text();if(raw.length>1000000)return json({error:'Conteúdo muito grande.'},413);if(!validSignature(raw,request.headers.get('x-hub-signature-256')))return json({error:'Assinatura inválida.'},403);await receiveWebhook(JSON.parse(raw));return json({received:true});}
  }
  if(method!=='GET'&&!sameOrigin(request))return json({error:'Origem não permitida.'},403);
  const actor=manager(request);
  if(route==='auth/session')return json({authenticated:Boolean(actor),email:actor,demo:demoMode(),configured:configured()});
  if(route==='auth/login'&&method==='POST'){
    if(!configured())return json({error:'Configure o acesso do gestor. Localmente, execute npm run setup.'},503);
    const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local';if(!await rateLimit('login:'+ip,8))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
    const data=z.object({email:z.string().max(254),password:z.string().max(256)}).parse(await body(request));
    if(data.email.toLowerCase()!==process.env.MANAGER_EMAIL?.toLowerCase()||!verifyPassword(data.password,process.env.MANAGER_PASSWORD_HASH!))return json({error:'E-mail ou senha incorretos.'},401);
    return new Response(JSON.stringify({authenticated:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`${cookieName}=${session(process.env.MANAGER_EMAIL!)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${url.protocol==='https:'?'; Secure':''}`}});
  }
  if(route==='auth/logout'&&method==='POST')return new Response('{}',{headers:{'Set-Cookie':`${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${url.protocol==='https:'?'; Secure':''}`}});
  if(route==='catalog'&&method==='GET'){const catalog=await getCatalog();return json({catalog,business:businessStatus(catalog),demo:demoMode()});}
  if(route==='customer-agent'&&method==='POST'){
    const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local';
    if(!await rateLimit('customer-agent:'+ip,60,60000))return json({error:'Vamos com calma. Tente novamente em um minuto.'},429);
    const data=z.object({message:z.string().trim().min(1).max(600),cartCount:z.number().int().min(0).max(800).default(0)}).parse(await body(request));
    return json(customerAssistant(data.message,await getCatalog(),data.cartCount));
  }
  if(route==='orders'&&method==='POST'){
    const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')||'unknown':'local';if(!await rateLimit('order:'+ip,40))return json({error:'Muitos pedidos. Aguarde alguns minutos.'},429);
    const key=request.headers.get('idempotency-key');if(!key||!/^[-\w]{16,100}$/.test(key))return json({error:'Identificador do pedido inválido.'},400);
    const result=await createOrder(await body(request),key);const {order}=result;return json({order:{orderCode:order.orderCode,trackingToken:order.trackingToken,status:order.status,total:order.total,subtotal:order.subtotal,deliveryFee:order.deliveryFee,date:order.date}},result.repeated?200:201);
  }
  if(path[0]==='orders'&&path.length===2&&method==='GET'){
    if(!/^[a-f0-9]{64}$/.test(path[1]))return json({error:'Pedido não encontrado.'},404);const order=await findOrder(path[1]);if(!order)return json({error:'Pedido não encontrado.'},404);
    if(actor)return json({order});
    return json({order:{orderCode:order.orderCode,status:order.status,method:order.method,total:order.total,date:order.date,statusUpdatedAt:order.statusUpdatedAt,items:order.items.map(i=>({name:i.name,quantity:i.quantity,lineTotal:i.lineTotal}))}});
  }
  if(!actor)return json({error:'Entre com o acesso do gestor.'},401);
  if(route==='dashboard'&&method==='GET')return json({...await operationData(),demo:demoMode(),aiConfigured:Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL),whatsappLive:!demoMode()&&process.env.WHATSAPP_LIVE==='true'});
  if(path[0]==='orders'&&path.length===2&&method==='PATCH'){const data=z.object({status:z.enum(statuses)}).parse(await body(request));return json({order:await transition(path[1],data.status,actor)});}
  if(route==='catalog'&&method==='PATCH'){
    const data=z.object({override:z.enum(['auto','open','closed']).optional(),product:z.object({id:z.string(),active:z.boolean().optional(),price:z.number().int().min(0).max(100000).optional()}).optional()}).strict().parse(await body(request));
    const d=await db(),tx=await d.transaction('write');try{const r=await tx.execute("SELECT value FROM settings WHERE key='catalog'");const catalog=JSON.parse(String(r.rows[0].value));if(data.override)catalog.override=data.override;if(data.product){const p=catalog.products.find((p:{id:string})=>p.id===data.product!.id);if(!p)throw new Error('Produto não encontrado.');Object.assign(p,data.product);}await tx.execute({sql:"UPDATE settings SET value=? WHERE key='catalog'",args:[JSON.stringify(catalog)]});await tx.execute({sql:'INSERT INTO events VALUES (?,NULL,?,?,?)',args:[crypto.randomUUID(),actor,'Catálogo atualizado',new Date().toISOString()]});await tx.commit();return json({saved:true});}catch(e){await tx.rollback();throw e;}finally{tx.close();}
  }
  if(route==='agent'&&method==='POST'){if(!await rateLimit('agent:'+actor,30,60000))return json({error:'Aguarde um minuto para continuar.'},429);const data=z.object({message:z.string().trim().min(1).max(2000)}).parse(await body(request));return json(await askAgent(data.message));}
  if(route==='demo/seed'&&method==='POST'){await seedDemo(actor);return json({created:true});}
  if(route==='whatsapp/simulate'&&method==='POST'){const data=z.object({message:z.string().trim().min(1).max(2000)}).parse(await body(request));return json(await simulateInbound(data.message));}
  if(route==='whatsapp/process'&&method==='POST')return json(await processMessages());
  return json({error:'Rota não encontrada.'},404);
}catch(e){if(e instanceof z.ZodError)return json({error:e.issues.map(i=>i.message).join(' ')},400);if(e instanceof SyntaxError)return json({error:'Dados inválidos.'},400);console.error(e instanceof Error?e.message:'Falha interna');const message=e instanceof Error?e.message:'Falha inesperada.';const known=/loja|produto|Adicional|Escolha|Personaliza|bairro|troco|status|Pedido|Simula|demonstra|Configure|Execute|configur/i.test(message);return json({error:known?message:'Não foi possível concluir. Tente novamente.'},known?409:500);}}
export const GET=handler;export const POST=handler;export const PATCH=handler;

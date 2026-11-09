import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { db, demoMode, getCatalog } from './store';
import { businessStatus, money } from './catalog';
export function validSignature(body:string,signature:string|null){if(!process.env.WHATSAPP_APP_SECRET||!signature)return false;const actual=Buffer.from(signature),expected=Buffer.from('sha256='+createHmac('sha256',process.env.WHATSAPP_APP_SECRET).update(body).digest('hex'));return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export async function customerReply(body:string){const catalog=await getCatalog();const text=body.toLowerCase();if(/humano|atendente|reclam|cancel|alerg|pagamento/.test(text))return {reply:'Vou encaminhar sua solicitação para a equipe. Um atendente precisa verificar esse assunto.',handoff:true};if(/hor[aá]rio|abert|fecha/.test(text))return {reply:`${businessStatus(catalog).message}. Horários cadastrados: ${catalog.hours.filter(h=>h.open).map(h=>`${['domingo','segunda','terça','quarta','quinta','sexta','sábado'][h.day]} ${h.from}–${h.to}`).join('; ')}.`,handoff:false};return {reply:`Olá! Sou a assistente do Macarrão Dellas. Temos ${catalog.products.filter(p=>p.active).length} opções disponíveis. Macarrão 500 ml a partir de ${money(Math.min(...catalog.products.filter(p=>p.active&&p.category==='p500').map(p=>p.price)))}. Monte e confirme seu pedido pelo cardápio do site. Para falar com a equipe, escreva “atendente”.`,handoff:false};}
export async function processMessages(){
  if(demoMode()||process.env.WHATSAPP_LIVE!=='true')return {processed:0,message:'Envio real desligado. As mensagens permanecem na demonstração ou na fila.'};
  if(!process.env.WHATSAPP_ACCESS_TOKEN||!process.env.WHATSAPP_PHONE_NUMBER_ID||!/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION||''))throw new Error('Configure as credenciais e a versão da Graph API.');
  const d=await db();const rows=await d.execute("SELECT * FROM messages WHERE state='queued' AND attempts<3 ORDER BY created_at LIMIT 10");let processed=0;
  for(const row of rows.rows){
    const claim=await d.execute({sql:"UPDATE messages SET state='sending',attempts=attempts+1 WHERE id=? AND state='queued'",args:[row.id]});if(!claim.rowsAffected)continue;
    const last=await d.execute({sql:'SELECT created_at FROM inbox WHERE phone=? ORDER BY created_at DESC LIMIT 1',args:[row.phone]});
    if(!last.rows[0]||Date.now()-new Date(String(last.rows[0].created_at)).getTime()>86400000){await d.execute({sql:"UPDATE messages SET state='needs_template',error=? WHERE id=?",args:['Fora da janela de atendimento. Configure um modelo aprovado antes de enviar.',row.id]});continue;}
    try{
      const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:'55'+String(row.phone).replace(/^55(?=\d{10,11}$)/,''),type:'text',text:{body:row.body}}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw new Error('O provedor recusou a mensagem. Confira a configuração no WhatsApp Manager.');
      await d.execute({sql:"UPDATE messages SET state='sent',provider_id=?,error=NULL WHERE id=?",args:[data.messages?.[0]?.id||null,row.id]});processed++;
    }catch(e){await d.execute({sql:"UPDATE messages SET state='uncertain',error=? WHERE id=?",args:[e instanceof Error?e.message:'Falha no envio. Verifique o provedor antes de repetir.',row.id]});}
  }
  return {processed,message:`${processed} mensagem(ns) enviada(s). Envios incertos precisam de revisão; não são repetidos automaticamente.`};
}
export async function receiveWebhook(payload:unknown){
  const data=payload as {entry?:{changes?:{value?:{messages?:{id:string;from:string;type:string;text?:{body:string}}[];statuses?:{id:string;status:string}[]}}[]}[]};const d=await db();
  for(const entry of data.entry||[])for(const change of entry.changes||[]){
    for(const m of change.value?.messages||[]){const body=m.type==='text'?m.text?.body||'':'[Mídia recebida: atendimento humano necessário]';const result=await customerReply(body);await d.execute({sql:'INSERT OR IGNORE INTO inbox (id,phone,body,reply,created_at,handoff) VALUES (?,?,?,?,?,?)',args:[m.id,m.from.replace(/^55(?=\d{10,11}$)/,''),body,result.reply,new Date().toISOString(),m.type!=='text'||result.handoff?1:0]});}
    for(const s of change.value?.statuses||[]){if(['sent','delivered','read','failed'].includes(s.status))await d.execute({sql:"UPDATE messages SET state=? WHERE provider_id=? AND (state!='read' OR ?='failed') AND (state!='delivered' OR ? IN ('read','failed'))",args:[s.status,s.id,s.status,s.status]});}
  }
}
export async function simulateInbound(body:string){if(!demoMode())throw new Error('Simulação desativada.');const d=await db(),result=await customerReply(body);await d.execute({sql:'INSERT INTO inbox (id,phone,body,reply,created_at,handoff) VALUES (?,?,?,?,?,?)',args:[randomUUID(),'85999990000',body,result.reply,new Date().toISOString(),result.handoff?1:0]});return result;}

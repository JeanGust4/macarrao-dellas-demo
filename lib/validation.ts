import { z } from 'zod';
import { businessStatus, type Catalog } from './catalog';
export const checkoutSchema=z.object({customer:z.string().trim().min(2).max(80),customerPhone:z.string().transform(v=>v.replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'')).refine(v=>/^[1-9]{2}9\d{8}$/.test(v),'Informe um celular com DDD.'),method:z.enum(['Entrega','Retirada']),address:z.string().trim().max(180).default(''),addressNumber:z.string().trim().max(20).default(''),neighborhood:z.string().trim().max(80).default(''),reference:z.string().trim().max(180).default(''),payment:z.enum(['Pix','Cartão','Dinheiro']),cashAmount:z.number().int().min(0).max(1000000).default(0),consent:z.boolean().default(false),items:z.array(z.object({productId:z.string().max(40),quantity:z.number().int().min(1).max(20),pasta:z.enum(['Talharim','Espaguete']).optional(),sauce:z.enum(['Branco','Rosê','Tomate']).optional(),ingredients:z.array(z.enum(['Milho','Ervilha','Queijo','Cheiro verde','Pimenta calabresa'])).max(5).default([]),extras:z.array(z.object({id:z.string().max(30),quantity:z.number().int().min(1).max(10)})).max(3).default([])})).min(1).max(40)});
export type Checkout=z.input<typeof checkoutSchema>;
export function priceOrder(input:unknown,catalog:Catalog) {
  const data=checkoutSchema.parse(input);
  if(!businessStatus(catalog).isOpen) throw new Error('A loja está fechada para novos pedidos.');
  if(data.method==='Entrega'&&(!data.address||!data.addressNumber||!Object.hasOwn(catalog.rates,data.neighborhood)))throw new Error('Informe rua, número e um bairro atendido.');
  const items=data.items.map(item=>{
    const p=catalog.products.find(p=>p.id===item.productId);
    if(!p?.active)throw new Error('Um produto não está disponível. Atualize o cardápio.');
    const isPasta=p.category==='p500'||p.category==='p750';
    if(isPasta&&(!item.pasta||!item.sauce))throw new Error('Escolha a massa e o molho.');
    if(!isPasta&&(item.extras.length||item.pasta||item.sauce||item.ingredients.length))throw new Error('Personalização inválida para este produto.');
    if(new Set(item.extras.map(e=>e.id)).size!==item.extras.length)throw new Error('Adicional repetido.');
    const extras=item.extras.map(e=>{const extra=catalog.extras.find(x=>x.id===e.id);if(!extra?.active||e.quantity>extra.max)throw new Error('Adicional indisponível ou quantidade inválida.');return {...e,name:extra.name,price:extra.price};});
    const unitPrice=p.price+extras.reduce((sum,e)=>sum+e.price*e.quantity,0);
    return {...item,extras,name:p.name,category:p.category,unitPrice,lineTotal:unitPrice*item.quantity};
  });
  const subtotal=items.reduce((sum,i)=>sum+i.lineTotal,0),deliveryFee=data.method==='Entrega'?catalog.rates[data.neighborhood]:0,total=subtotal+deliveryFee;
  if(data.payment==='Dinheiro'&&data.cashAmount!==0&&data.cashAmount<total)throw new Error('O valor para troco deve ser maior ou igual ao total.');
  return {...data,items,subtotal,deliveryFee,total};
}
export type PricedOrder=ReturnType<typeof priceOrder>;
export const statuses=['Pendente','Aceito','Em preparo','Saiu para entrega','Pronto para retirada','Finalizado','Recusado'] as const;
export type Status=typeof statuses[number];
export function canTransition(from:Status,to:Status,method:string) {
  const next:Record<Status,Status[]>={Pendente:['Aceito','Recusado'],Aceito:['Em preparo','Recusado'],'Em preparo':[method==='Retirada'?'Pronto para retirada':'Saiu para entrega'],'Saiu para entrega':['Finalizado'],'Pronto para retirada':['Finalizado'],Finalizado:[],Recusado:[]};
  return next[from]?.includes(to)??false;
}

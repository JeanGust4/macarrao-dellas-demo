export type Product = { id: string; name: string; category: string; price: number; description: string; active: boolean; image: string };
export type Catalog = { products: Product[]; override: 'open' | 'closed' | 'auto'; hours: { day: number; open: boolean; from: string; to: string }[]; rates: Record<string, number>; extras: { id: string; name: string; price: number; max: number; active: boolean }[] };
export const categories = [ { id: 'p500', name: 'Macarrão 500 ml', detail: 'Na medida da sua fome' }, { id: 'p750', name: 'Macarrão 750 ml', detail: 'Uma porção generosa' }, { id: 'extras', name: 'Petiscos', detail: 'Para compartilhar' }, { id: 'dogs', name: 'Hot dogs', detail: 'Um clássico caprichado' }, { id: 'drinks', name: 'Bebidas', detail: 'A combinação perfeita' } ];
export const drinkImages:Record<string,string>={'Coca-Cola Original':'coca-cola','Coca-Cola Zero':'coca-cola-zero','Sprite':'sprite','São Geraldo':'sao-geraldo','Fanta Laranja':'fanta-laranja','Fanta Uva':'fanta-uva'};
export function productImage(product:Product){return product.category==='drinks'&&drinkImages[product.name]?`/assets/drinks/${drinkImages[product.name]}.svg`:product.image;}
const rows: [string,string,number][] = [ ['p500','Carne do Sol',18],['p500','Carne Moída',17],['p500','Frango',16],['p500','Calabresa',16],['p500','Frango + Calabresa',18],['p500','Frango + Bacon',18],['p500','Calabresa + Bacon',18],['p500','Carne do Sol + Bacon',20],['p750','Carne do Sol',28],['p750','Camarão',35],['p750','Carne Moída',25],['p750','Frango',25],['p750','Frango + Bacon',27],['p750','Carne do Sol + Bacon',30],['p750','Calabresa',25],['p750','Frango + Calabresa',27],['p750','Calabresa + Bacon',27],['p750','Carne Moída + Calabresa',27],['extras','Arroz de camarão',20],['extras','Arroz de carne de sol',20],['extras','Canudão de vatapá',5],['extras','Mini salgados — 10 unidades',8],['extras','Mini salgados — 20 unidades',15],['extras','Porção de batata frita',10],['dogs','Hot dog carne moída',7],['dogs','Hot dog de calabresa',10],['dogs','Hot dog de bacon',10],['drinks','Coca-Cola Original',6],['drinks','Coca-Cola Zero',6],['drinks','Sprite',6],['drinks','São Geraldo',6],['drinks','Fanta Laranja',6],['drinks','Fanta Uva',6] ];
export const initialCatalog: Catalog = {
  products: rows.map(([category,name,price],i)=>({id:'p'+i,category,name,price:price*100,active:true,description:category.startsWith('p')?'Escolha a massa, o molho e deixe do seu jeito.':category==='drinks'?'Lata de 350 ml, bem gelada.':'Preparado com o capricho da casa.',image:category==='dogs'?'/assets/hot-dogs-melhorados.png':category==='drinks'?`/assets/drinks/${drinkImages[name]}.svg`:'/assets/macarronada-camarao-video-melhorada.png'})),
  override:'auto',
  hours:Array.from({length:7},(_,day)=>({day,open:day!==1,from:'18:00',to:'23:00'})),
  rates:{'Planalto Ayrton Senna':300,'Renascer':400,'Cidade Nova':400,'Arvoredo':400},
  extras:[{id:'egg',name:'Ovo de codorna',price:100,max:10,active:true},{id:'sausage',name:'Salsicha',price:200,max:3,active:true},{id:'calabresa',name:'Calabresa extra',price:300,max:3,active:true}]
};
export const money = (cents:number) => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function businessStatus(catalog:Catalog, now=new Date()) {
  if(catalog.override!=='auto') return {isOpen:catalog.override==='open',message:catalog.override==='open'?'Aberto para pedidos':'Fechado no momento'};
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Fortaleza',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||'';
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
  const time=Number(get('hour'))*60+Number(get('minute'));
  const mins=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
  const today=catalog.hours.find(h=>h.day===day),yesterday=catalog.hours.find(h=>h.day===(day+6)%7);
  const isOpen=Boolean(today?.open&&(mins(today.from)<=mins(today.to)?time>=mins(today.from)&&time<mins(today.to):time>=mins(today.from))) || Boolean(yesterday?.open&&mins(yesterday.from)>mins(yesterday.to)&&time<mins(yesterday.to));
  return {isOpen,message:isOpen?'Aberto para pedidos':'Fechado · confira os horários'};
}

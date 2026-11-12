import { businessStatus, categories, money, type Catalog } from './catalog';

export type HelpAction = {
  type: 'category' | 'product' | 'cart' | 'tour';
  label: string;
  value?: string;
};

export type HelpReply = {
  answer: string;
  actions: HelpAction[];
  handoffToGemini?: boolean;
};

/**
 * Monta um texto legível do cardápio para a Gemini.
 * Ajuste os campos se o seu catálogo tiver outro formato.
 * Ideal: massas, molhos e opcionais virem do próprio catálogo.
 */
export function buildMenuContext(catalog: Catalog): string {
  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const products = catalog.products
    .filter((p) => p.active)
    .map((p) => `- ${p.name} (${catName(p.category)}): ${money(p.price)}`)
    .join('\n');

  const rates = Object.entries(catalog.rates)
    .map(([bairro, taxa]) => `- ${bairro}: ${money(taxa)}`)
    .join('\n');

  return `
COMO MONTAR OS MACARRÕES (500 ml e 750 ml):
- Massas: Talharim ou Espaguete
- Molhos: Branco, Rosê ou Tomate
- Ingredientes opcionais: sem custo. Adicionais: cobrados por unidade.
- Tamanhos: 500 ml é a porção individual; 750 ml é uma porção maior. A quantidade ideal depende da fome de cada pessoa.

PRODUTOS DISPONÍVEIS:
${products}

TAXAS DE ENTREGA POR BAIRRO:
${rates}

STATUS DA LOJA: ${businessStatus(catalog).message}
`.trim();
}

export function customerAssistant(
  message: string,
  catalog: Catalog,
  cartCount = 0
): HelpReply {
  const text = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const categoryActions: HelpAction[] = categories.map((c) => ({
    type: 'category',
    label: c.name,
    value: c.id
  }));

  // 1. Recomendações personalizadas: encaminhar para Gemini
  // (sem \b no fim dos radicais, para casar "indica", "recomenda", etc.)
  const isRecommendation =
    /\b(recomend|sugest|indic|combin|harmoniz)/.test(text) ||
    /\bqual\b.*\b(melhor|ideal)\b/.test(text) ||
    /\bo que\b.*\b(combina|escolher|pedir)/.test(text);

  if (isRecommendation) {
    return {
      answer: '',
      actions: [],
      handoffToGemini: true
    };
  }

  // 2. Alergias e restrições alimentares
  if (/alerg|gluten|lactose|celiac|intoleran/.test(text)) {
    return {
      answer:
        'Para alergias ou restrições alimentares, confirme os ingredientes e o risco de contaminação cruzada diretamente com a equipe antes de pedir. Eu não consigo garantir que um prato seja seguro para uma restrição.',
      actions: []
    };
  }

  // 3. Pagamento
  if (/pagar|pagamento|pix|cartao|dinheiro/.test(text)) {
    return {
      answer:
        'Você escolhe Pix, cartão ou dinheiro na etapa final. Se precisar de troco, informe o valor. O site registra a forma escolhida; ele não confirma pagamento nem pede dados do cartão. Antes de confirmar, confira o total com a entrega.',
      actions: cartCount
        ? [{ type: 'cart', label: 'Escolher pagamento' }]
        : [{ type: 'tour', label: 'Começar meu pedido' }]
    };
  }

  // 4. Entrega e retirada
  if (/entreg|bairro|taxa|frete|retira/.test(text)) {
    return {
      answer: `Você pode escolher entrega ou retirada. Na entrega, selecione seu bairro e informe rua e número. Atendemos:
${Object.entries(catalog.rates)
  .map(([n, p]) => `${n}: ${money(p)}`)
  .join('\n')}
A taxa entra no total antes da confirmação. Na retirada não há taxa de entrega.`,
      actions: cartCount
        ? [{ type: 'cart', label: 'Preencher recebimento' }]
        : [{ type: 'tour', label: 'Escolher meu prato' }]
    };
  }

  // 5. Horário de funcionamento
  if (/horario|abert|fechad|funcion/.test(text)) {
    return {
      answer: `${businessStatus(catalog).message}.
${catalog.hours
  .filter((h) => h.open)
  .map(
    (h) =>
      `${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][h.day]}: ${h.from} às ${h.to}`
  )
  .join('\n')}
Horários no fuso de Fortaleza. A equipe pode abrir ou fechar manualmente.`,
      actions: categoryActions.slice(0, 2)
    };
  }

  // 6. Acompanhamento de pedidos
  if (
    /acompan|meu pedido|status|onde esta/.test(text) &&
    !/finaliz|carrinho/.test(text)
  ) {
    return {
      answer:
        'Depois de confirmar, toque em “Acompanhar pedido” na tela de confirmação. Esse link mostra o aceite da equipe, o preparo e a entrega ou retirada. Guarde o link. Por privacidade, eu não consulto pedidos de outros clientes pelo nome ou telefone.',
      actions: cartCount
        ? [{ type: 'cart', label: 'Ver meu carrinho' }]
        : [{ type: 'tour', label: 'Fazer um pedido' }]
    };
  }

  // 7. Finalização e carrinho
  if (/finaliz|carrinho|confirm|terminei|comprar agora/.test(text)) {
    return cartCount
      ? {
          answer: `Você tem ${cartCount} item(ns) no carrinho. Vou te levar para “Seu pedido”. Confira os itens, informe seu nome e celular, escolha entrega ou retirada e a forma de pagamento. Só o botão final registra o pedido.`,
          actions: [{ type: 'cart', label: 'Abrir meu pedido' }]
        }
      : {
          answer:
            'Seu carrinho está vazio. Primeiro vamos escolher um prato. Você prefere uma porção individual de 500 ml, uma porção de 750 ml ou outra opção?',
          actions: categoryActions
        };
  }

  // 8. Dúvidas sobre montagem e personalização
  if (
    /como montar|como escolher|como personalizar|como adicionar|como funciona a montagem|quais sao os ingredientes|como faco meu prato|como preparo meu prato/.test(
      text
    )
  ) {
    return {
      answer:
        'É simples: toque no + do prato, escolha Talharim ou Espaguete e depois o molho Branco, Rosê ou Tomate. Os ingredientes opcionais não têm custo. Os adicionais mostram o preço por unidade. Confira o valor e toque em “Adicionar”.',
      actions: categoryActions.slice(0, 2)
    };
  }

  // 9. Identificação de categorias
  const category =
    text.includes('750')
      ? 'p750'
      : text.includes('500')
        ? 'p500'
        : /bebida|refrigerante|coca|sprite|fanta/.test(text)
          ? 'drinks'
          : /hot dog|hotdog|cachorro/.test(text)
            ? 'dogs'
            : /petisco|salgado|batata|arroz/.test(text)
              ? 'extras'
              : null;

  // 10. Busca por produtos específicos
  const terms = [
    'frango',
    'carne',
    'calabresa',
    'camarao',
    'coca',
    'sprite',
    'fanta',
    'geraldo'
  ].filter((t) => text.includes(t));

  if (category || terms.length) {
    let products = catalog.products.filter(
      (p) => p.active && (!category || p.category === category)
    );

    if (terms.length) {
      products = products.filter((p) => {
        const productName = p.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return terms.every((t) => productName.includes(t));
      });
    }

    if (/barat|menor|econom/.test(text)) {
      products.sort((a, b) => a.price - b.price);
    }

    return {
      answer: products.length
        ? `Estas opções estão disponíveis. Toque em uma para ${
            category === 'drinks'
              ? 'escolher a quantidade'
              : 'montar seu pedido'
          }. O preço abaixo é do produto, sem adicionais ou entrega.`
        : 'Não encontrei essa combinação disponível. Vamos olhar outra categoria?',
      actions: products.length
        ? products.slice(0, 6).map((p) => ({
            type: 'product' as const,
            value: p.id,
            label: `${p.name}${
              p.category === 'p500'
                ? ' · 500 ml'
                : p.category === 'p750'
                  ? ' · 750 ml'
                  : ''
            } · ${money(p.price)}`
          }))
        : categoryActions
    };
  }

  // 11. Tamanho e porções
  if (/\b(tamanhos?|porcao|porcoes)\b|quanto serve|serve quantas|quantas pessoas/.test(text)) {
    return {
      answer:
        'O macarrão de 500 ml é a porção individual. O de 750 ml é uma porção maior. A quantidade ideal depende da fome de cada pessoa. Qual você quer conhecer?',
      actions: categoryActions.slice(0, 2)
    };
  }

  // 12. Conversa livre: encaminha perguntas não classificadas para Gemini
  return {
    answer: '',
    actions: [],
    handoffToGemini: true
  };
}
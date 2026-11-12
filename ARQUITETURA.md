# Como a demo funciona

## Base técnica

Next.js 16.4.6 com App Router, React 19.2.6, TypeScript e Node.js 24.x. A validação usa Zod 4.6.7. O acesso SQLite/libSQL usa `@libsql/client`. As imagens e ilustrações são arquivos locais em `public/assets`.

## Fluxo do pedido

1. O cardápio consulta `/api/catalog` para obter produtos, preços, adicionais, bairros e funcionamento.
2. O cliente monta um carrinho no navegador. Somente o carrinho é salvo no armazenamento local; os campos do checkout ficam no estado da página.
3. O envio para `/api/orders` inclui uma chave de idempotência. O servidor valida os campos, produtos, quantidades, adicionais e funcionamento e recalcula o total.
4. Uma transação salva o pedido, o evento e, quando autorizado, uma mensagem simulada. O número é gerado pelo banco.
5. O retorno contém um token aleatório usado no acompanhamento. A consulta pública não inclui nome, celular ou endereço.
6. O painel autenticado permite avançar o status pelas transições válidas. Cada mudança gera histórico e, quando autorizado, mensagem de atualização.

## Banco local

As tabelas são criadas de forma idempotente em `lib/store.ts`:

| Tabela | Uso |
| --- | --- |
| `settings` | Catálogo e marca de exemplos já carregados |
| `orders` | Pedidos, número, token, status e conteúdo validado |
| `events` | Histórico de ações e mudanças |
| `messages` | Fila de saída e estados de mensagens |
| `inbox` | Entrada de conversas e respostas sugeridas |
| `limits` | Contagem e janela de limitação de requisições |

Sem URL remota, o banco é `data/dellas.db`. A pasta `data` é ignorada pelo Git e não deve ser compartilhada. Testes criam seus próprios arquivos de banco nessa pasta; não alteram o banco normal.

## Autenticação e API

O setup cria um segredo aleatório e uma senha derivada com scrypt e sal. A sessão é assinada e expira após 12 horas. O cookie é HttpOnly e SameSite=Strict; usa Secure quando a origem é HTTPS. A API verifica a sessão nas operações administrativas e a origem nas alterações. Login, criação de pedido e consultas dos assistentes têm limites persistidos no banco.

As rotas são reunidas em `app/api/[...path]/route.ts`. O conteúdo de erros inesperados não é retornado diretamente ao cliente. Não existe confirmação automática de pagamento.

## Assistentes

A Rafaele, assistente do cliente, combina regras locais com a API do Google Gemini. As regras locais identificam intenções e tratam ações de navegação e funcionalidades relacionadas ao cardápio. Perguntas abertas e solicitações de recomendações podem ser encaminhadas ao Gemini.

Quando uma consulta é encaminhada à IA, o servidor envia o histórico da conversa e o contexto do cardápio para gerar respostas contextualizadas. A integração utiliza a variável GEMINI_API_KEY, configurada no servidor. A Rafaele não acessa pedidos privados, não grava pedidos e não recebe os campos de endereço ou telefone do checkout.

A assistente do gestor opera atrás do login e consulta a operação. Sem credenciais externas, responde por regras. O adaptador opcional de IA utiliza a Responses API da OpenAI e recebe um resumo limitado produzido pelo servidor, sem dispor de ferramentas de alteração.

## Atualização das telas

Catálogo: consulta periódica a cada 30 segundos. Painel: 10 segundos. Acompanhamento: 7 segundos. Não há WebSocket, tarefa agendada ou fila externa obrigatória.
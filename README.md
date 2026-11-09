# Macarrão Dellas · código-fonte da demo

Pacote independente para compartilhar, executar, testar e modificar em outros computadores. Inclui o código da demo, o cardápio, as imagens, a mascote Rafaele, o painel e os testes. Não depende de hospedagem, conta Vercel ou banco remoto.

## Começar

Instale **Node.js 24.x**, extraia o ZIP e abra um terminal na pasta que contém `package.json`.

```sh
npm ci
npm run setup
npm run dev
```

Abra **http://127.0.0.1:3000**. O painel está em **http://127.0.0.1:3000/gestor**.

**Atalho no Windows:** depois de instalar o Node.js 24.x, dê dois cliques em `INICIAR-DEMO.cmd`. Ele instala as dependências se necessário, faz a configuração inicial e inicia o servidor. Mantenha a janela aberta e copie o endereço para o navegador. Para verificar alterações, pare o servidor e execute `VERIFICAR-DEMO.cmd`.

`npm run setup` cria `.env.local` com uma senha aleatória e mostra o acesso uma vez no terminal. Cada pessoa gera suas próprias credenciais. O comando não substitui um arquivo existente.

O banco SQLite é criado automaticamente em `data/dellas.db` no primeiro acesso à API. Os dados persistem no computador do testador, mesmo depois de reiniciar o servidor. Nenhum dado da publicação online foi incluído. Os computadores não compartilham pedidos no modo local.

No painel, clique em **Carregar exemplos** para criar cinco pedidos fictícios. Isso só acontece uma vez por banco. Para repetir a apresentação do zero, use uma nova cópia do projeto e execute a configuração novamente.

## Recursos incluídos

- Cardápio por categoria, busca, personalização da massa, molho, ingredientes e adicionais.
- Carrinho persistido no navegador, entrega por bairro e retirada, seleção de pagamento e troco.
- Total calculado no servidor em centavos, com validação do catálogo, disponibilidade e horário.
- Proteção contra repetição do mesmo pedido, numeração sequencial e acompanhamento por link.
- Painel com login, fila de pedidos, transições de status, histórico e alteração de preços e disponibilidade.
- Abertura automática pelos horários e abertura ou fechamento manual.
- Rafaele: mascote de cozinheira jovem, conversa guiada para clientes e botões ligados ao cardápio e ao carrinho.
- Assistente interna do gestor: consulta vendas, pedidos parados e prepara sugestões de resposta.
- WhatsApp simulado: mensagens de pedidos, conversa de exemplo e encaminhamento para atendente.
- Adaptadores opcionais de WhatsApp oficial e IA externa, desligados por padrão.

## Roteiro para testar

1. Entre no painel usando o acesso exibido pelo setup e carregue os exemplos.
2. Abra o cardápio em outra aba. Converse com a Rafaele e escolha um prato pela conversa.
3. Personalize o prato, adicione uma bebida e abra o carrinho.
4. Use nome, endereço e celular fictícios com formato válido. Se quiser ver mensagens simuladas, marque a autorização para atualizações do pedido.
5. Confira a taxa e o total e confirme o pedido de teste. Não ocorre cobrança.
6. Guarde o link de acompanhamento. No painel, avance o pedido por aceite, preparo, entrega ou retirada e conclusão.
7. Confira o status na outra aba. O painel atualiza a cada 10 segundos; o acompanhamento a cada 7 segundos.
8. Na assistente do gestor, pergunte “Resuma as vendas de hoje” e “Quais pedidos estão parados há mais de 15 minutos?”.
9. Em WhatsApp, simule uma pergunta sobre horário e depois “Quero falar com atendente”. Nenhuma mensagem externa será enviada.

## Testes e compilação

```sh
npm test
npm run typecheck
npm run build
npm run start
```

Pare `npm run dev` antes de compilar e iniciar a versão compilada. `dev` e `start` usam a porta 3000. Para usar outra porta: `npm run dev -- --port 3001`.

O projeto inclui 13 testes de orientação da Rafaele, preços, disponibilidade, entrega, status, horário, autenticação e persistência. `typecheck` gera os tipos do Next.js antes de conferir o código, inclusive em uma cópia recém-extraída.

## Onde alterar

| O que mudar | Arquivo |
| --- | --- |
| Cardápio e experiência de compra | `app/page.tsx` |
| Aparência e adaptação às telas | `app/globals.css` |
| Painel do gestor | `app/gestor/page.tsx` |
| Acompanhamento do pedido | `app/pedido/page.tsx` |
| Nome, apresentação e botões da Rafaele | `app/customer-helper.tsx` |
| Respostas e sugestões da Rafaele | `lib/customer-assistant.ts` |
| Mascote | `public/assets/rafaelle-chef.png` |
| Produtos e configurações iniciais | `lib/catalog.ts` |
| Regras, validações e cálculo do pedido | `lib/validation.ts` |
| Banco, histórico e transações | `lib/store.ts` |
| Rotas da API e permissões | `app/api/[...path]/route.ts` |
| Autenticação | `lib/auth.ts` |
| Assistente interna do gestor | `lib/agent.ts` |
| Simulação e conexão de WhatsApp | `lib/whatsapp.ts` |
| Casos de teste | `tests/` |

O catálogo inicial é usado apenas na criação de um banco novo. Alterar `lib/catalog.ts` não substitui preços já salvos no banco existente: use o painel ou teste com um banco novo.

## O que não acompanha o pacote

Senhas, tokens, `.env.local`, vínculos com hospedagem, banco usado online, pedidos reais, sessões, histórico Git, `node_modules` e arquivos gerados de compilação. O arquivo `.env.example` contém somente nomes de configurações e valores vazios ou próprios de demonstração.

## Limites da demo

- Os dois assistentes usam regras locais no modo padrão; a compreensão de texto livre tem limites. Eles não são modelos de linguagem nesse modo.
- A Rafaele orienta e abre telas, mas o cliente deve escolher e confirmar o pedido.
- O pagamento é somente uma escolha registrada; não há cobrança, conciliação ou confirmação financeira.
- Não há envio real de WhatsApp no modo de demonstração. Veja `INTEGRACOES.md`.
- O painel tem um acesso administrativo, sem usuários e funções separados.
- Horários e bairros são exemplos; confirme com a operação antes de uso real.
- As imagens de pratos são ilustrativas; nem todo sabor possui uma fotografia específica. As bebidas usam ilustrações locais.
- As fontes tipográficas são carregadas de um serviço externo, com fonte alternativa quando não houver conexão. A primeira instalação exige internet para baixar dependências.
- Rodar `dev` é indicado para testes no próprio computador, não para expor esse servidor diretamente na internet.

## Encontrou um erro?

Consulte **TESTES-E-CORRECOES.md** para registrar a reprodução e conferir uma correção. Você pode editar os arquivos e compartilhar uma nova cópia do projeto ou criar seu próprio repositório Git, preservando `.gitignore`. Não inclua dados pessoais nem credenciais ao compartilhar.

Veja também **ARQUITETURA.md**, **RAFAELE.md**, **INTEGRACOES.md** e **ORIGEM.md**.

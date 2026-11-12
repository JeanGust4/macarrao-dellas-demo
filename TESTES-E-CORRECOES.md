# Como testar e reportar erros

## Antes de alterar

Use uma cópia própria, Node.js 24.x e `npm ci`. Execute `npm test` e `npm run typecheck`. Guarde o resultado inicial para distinguir um erro existente de um erro introduzido pela mudança.

A Rafaele depende do pacote `@google/genai`. Confirme que ele consta em `package.json` e `package-lock.json`.

## Configuração da API Gemini

A Rafaele utiliza a API do Google Gemini para responder perguntas e recomendar combinações do cardápio.

Para executar a assistente localmente:

1. Acesse o [Google AI Studio](https://aistudio.google.com/api-keys).
2. Gere sua própria chave de API.
3. Crie o arquivo `.env.local` na raiz do projeto.
4. Adicione a variável:

```env
GEMINI_API_KEY=sua_chave_aqui
```

5. Opcional: para trocar o modelo sem alterar o código, adicione também `GEMINI_MODEL=nome_do_modelo`.
6. Salve o arquivo e inicie o projeto.

```bash
npm run dev
```

Não é necessário gerar uma nova chave a cada execução. Uma chave válida pode ser reutilizada enquanto estiver ativa e dentro dos limites de uso.

**Importante:**
- Cada desenvolvedor deve configurar sua própria chave.
- Nunca compartilhe sua chave publicamente.
- Nunca envie o arquivo `.env.local` para o GitHub.
- O arquivo `.env.example` deve conter apenas os nomes das variáveis, sem credenciais reais.
- Não coloque a chave diretamente no código-fonte.

**O que é enviado ao Google:** quando a pergunta vai para a Gemini, seguem a mensagem do cliente, as últimas mensagens da conversa e um texto com o cardápio atual, preços, taxas de entrega e status da loja. Dados de carrinho, checkout e pedidos não são enviados. Nos testes, não digite dados de pessoas reais na conversa.

## Modelo de relato

Copie e preencha:

```text
Título:
Sistema operacional e versão do navegador:
Versão do Node.js (node --version):
Tela em que aconteceu:
Passos para reproduzir:
1.
2.
3.
Resultado esperado:
Resultado observado:
Acontece sempre ou às vezes?
Mensagem de erro do terminal ou navegador:
Arquivos alterados antes do erro:
Imagem da tela, se ajudar:
```

Não inclua senhas, cookies, tokens, chaves de API, `.env.local`, nome, telefone, endereço ou pedido de uma pessoa real. Use dados fictícios. Não compartilhe o banco inteiro para relatar um problema.

## Depois de corrigir

1. Repita os passos que reproduziam o erro.
2. Execute `npm test`, `npm run typecheck` e `npm run build`.
3. Confira o fluxo relacionado no navegador: cardápio → montagem → carrinho → pedido → painel → acompanhamento.
4. Teste a Rafaele com perguntas sobre o cardápio, recomendações de massas e molhos e dúvidas sobre o funcionamento do site.
5. Quando a correção mudar uma regra de negócio, acrescente um teste que reproduza o problema, sem somente copiar a implementação.
6. Descreva os arquivos alterados, o motivo, como verificou e qualquer limitação restante.

## Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| `npm` não encontrado | Instalação do Node.js 24.x; feche e abra o terminal depois de instalar |
| Porta 3000 ocupada | Pare o outro servidor ou execute `npm run dev -- --port 3001` |
| Painel não configurado | Execute `npm run setup` e reinicie o servidor |
| Setup informa que o arquivo existe | Ele preserva `.env.local`. Para uma configuração limpa, use uma nova cópia do projeto |
| Senha esquecida | O hash não permite recuperar a senha. Para testes, use uma nova cópia com novo setup |
| Loja fechada | No painel, abra manualmente; o modo automático usa os horários de Fortaleza |
| Produto alterado no código não mudou | Um banco existente conserva o catálogo salvo. Altere pelo painel ou use uma cópia com banco novo |
| Pedido não aparece em outro computador | Bancos locais são independentes; cada cópia tem seus próprios dados |
| Mensagem de origem não permitida | Abra o site sempre pelo mesmo endereço e porta; não misture localhost e outro host nas requisições |
| Pedido de teste não aceita celular | Informe um celular fictício com formato válido, incluindo DDD e nove dígitos |
| WhatsApp não enviou | Esse é o comportamento do modo demonstração; a fila mostra mensagens simuladas |
| Tipografia diferente sem internet | As fontes têm alternativas locais; as imagens do projeto continuam locais |
| Erro na Rafaele ou Gemini | Confira se `GEMINI_API_KEY` está configurada corretamente no `.env.local` e se a chave está válida. Reinicie o servidor depois de alterar o arquivo |
| Gemini não responde | Confira a conexão com a internet, os limites de uso da API e a mensagem de erro no terminal. Se o nome do modelo não existir na sua conta, ajuste `GEMINI_MODEL` |
| Arquivos de compilação inconsistentes | Pare todos os servidores da cópia, rode `npm run build` e então `npm run start` |

## Compartilhar alterações

Compartilhe código, imagens necessárias, documentação, testes e `package-lock.json`. Preserve `.gitignore`. Exclua `node_modules`, `.next`, `data`, `.env.local`, `.git` e quaisquer configurações pessoais. As dependências serão recuperadas com `npm ci` no outro computador.

Cada desenvolvedor deverá configurar suas próprias variáveis de ambiente e sua própria chave da API Gemini antes de executar a Rafaele localmente.
# Como testar e reportar erros

## Antes de alterar

Use uma cópia própria, Node.js 24.x e `npm ci`. Execute `npm test` e `npm run typecheck`. Guarde o resultado inicial para distinguir um erro existente de um erro introduzido pela mudança.

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

Não inclua senhas, cookies, tokens, `.env.local`, nome, telefone, endereço ou pedido de uma pessoa real. Use dados fictícios. Não compartilhe o banco inteiro para relatar um problema.

## Depois de corrigir

1. Repita os passos que reproduziam o erro.
2. Execute `npm test`, `npm run typecheck` e `npm run build`.
3. Confira o fluxo relacionado no navegador: cardápio → montagem → carrinho → pedido → painel → acompanhamento.
4. Quando a correção mudar uma regra de negócio, acrescente um teste que reproduza o problema, sem somente copiar a implementação.
5. Descreva os arquivos alterados, o motivo, como verificou e qualquer limitação restante.

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
| Arquivos de compilação inconsistentes | Pare todos os servidores da cópia, rode `npm run build` e então `npm run start` |

## Compartilhar alterações

Compartilhe código, imagens necessárias, documentação, testes e `package-lock.json`. Preserve `.gitignore`. Exclua `node_modules`, `.next`, `data`, `.env.local`, `.git` e quaisquer configurações pessoais. As dependências serão recuperadas com `npm ci` no outro computador.

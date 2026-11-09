# Integrações opcionais

A demo local funciona sem conta externa. O padrão criado pelo setup é `DEMO_MODE=true` e `WHATSAPP_LIVE=false`. Não preencha as configurações abaixo apenas para testar o site.

## IA externa

O painel possui um adaptador opcional para a Responses API. Somente se desejar testá-lo, configure `OPENAI_API_KEY` e `OPENAI_MODEL` em `.env.local` e reinicie o servidor. A chave fica no servidor. O modo padrão usa regras locais. A Rafaele do cliente permanece uma assistente guiada pelo catálogo.

Chamadas externas dependem de conta, modelo disponível e créditos e podem gerar custos. Esse adaptador não executa mudanças em pedidos.

## WhatsApp oficial

O código contém webhook assinado, caixa de entrada e envio de texto sob comando do gestor. Configure suas próprias credenciais somente em um ambiente de integração separado: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_GRAPH_VERSION`.

O callback é `/api/whatsapp/webhook`, que precisa de um endereço HTTPS acessível pelo provedor para receber mensagens reais. Um servidor restrito ao próprio computador não recebe eventos da internet.

O envio real só fica habilitado com `DEMO_MODE=false` e `WHATSAPP_LIVE=true`. O código exige autorização do cliente no pedido e uma mensagem recebida desse cliente nas últimas 24 horas para enviar texto livre. Fora dessa janela, marca a necessidade de modelo aprovado e não envia. Modelos aprovados ainda não têm envio implementado nesta demo. Falhas incertas ficam para revisão, evitando repetição automática.

As respostas a mensagens recebidas são sugestões, não respostas externas automáticas. Gestão completa de descadastro, retenção, campanhas e automação agendada não está finalizada.

## Banco remoto

Opcionalmente, `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` permitem usar um banco libSQL remoto. Deixe ambos vazios para manter o banco local. Não reaproveite credenciais ou banco da demonstração publicada ao distribuir o código. Configure um banco próprio se precisar compartilhar dados entre instalações.

## Dados sensíveis

Todas as configurações ficam em arquivos `.env` ignorados pelo Git. O arquivo `.env.example` contém apenas os nomes necessários. Não compartilhe arquivos preenchidos, banco, sessões ou tokens junto com o código.

# Rafaele · assistente do cliente

A Rafaele aparece no canto do cardápio e ajuda clientes a escolher um produto, entender a montagem, consultar bairros e taxas, abrir o carrinho e acompanhar o pedido. Usa o catálogo atual do servidor e não consulta informações privadas dos pedidos. Não confirma compras automaticamente. O cliente escolhe os ingredientes e confirma o pedido no formulário.

O modo padrão é um assistente guiado por regras, sem chave de IA ou custo externo. A compreensão de texto livre é limitada aos assuntos do cardápio e da navegação. Perguntas sobre restrições alimentares orientam a consultar a equipe. Não promete prazo, pagamento ou segurança alimentar.

Os botões da conversa abrem a categoria, a montagem do produto ou o carrinho existente. A leitura em voz alta é opcional e depende das vozes disponíveis no navegador/dispositivo. Nenhum microfone é usado. Não há histórico de conversa enviado a um modelo externo ou salvo no banco; cada consulta contém a pergunta e a quantidade de itens, sem dados do checkout.

## Mascote

Arquivo: `public/assets/rafaelle-chef.png`. Gerada com a ferramenta integrada de imagens, fundo transparente, e copiada para o projeto. Personagem adulta jovem, com aparência de aproximadamente 25 anos, uniforme creme, avental vinho e detalhes dourados.

Prompt de criação: “Create a single polished brand mascot cutout for a Brazilian pasta delivery restaurant named Macarrão Dellas. A friendly youthful ADULT woman chef about 25 years old, warm medium tan skin, brown eyes, dark brown curly hair tied back with a few soft curls framing her face. White chef toque, ivory chef jacket with subtle burgundy piping, burgundy apron, small golden details. Charming premium 3D clay-like illustration with soft realistic materials, expressive welcoming smile, approachable confident professional, wholesome nonsexual. Waist-up front three-quarter pose, one hand gently waving hello, other hand holding a small wooden spoon. Strong clean silhouette, readable at tiny chat avatar size, large face, no text, no letters, no logo, no circle frame, no extra characters. Isolated on genuinely transparent background. Full toque and hands within frame, generous padding. Color palette burgundy #3c111a, cream #faf8f3, muted gold #edbd67. This is the customer help assistant mascot for a real restaurant website, not a game pet.”

## Arquivos

- `app/customer-helper.tsx`: conversa e atalhos ligados ao cardápio.
- `lib/customer-assistant.ts`: respostas e sugestões com dados atuais.
- `/api/customer-agent`: consulta pública, com validação e limite de requisições.
- `tests/customer-assistant.test.ts`: navegação, preços, disponibilidade, privacidade e limites de orientação.

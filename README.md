# Model Studeo

Aplicação para criar modelos virtuais realistas vestindo **exatamente** as roupas de referência, com foco em conteúdo vertical 9:16 para TikTok Shop.

## Prioridade

1. Fidelidade absoluta ao produto  
2. Consistência da personagem  
3. Anatomia · realismo · UGC  

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS  
- Armazenamento local JSON (`data/`) + uploads (`uploads/`)  
- Providers de IA abstratos com **mock mode** (`AI_PROVIDER=mock`)

## Como rodar

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Fluxo do usuário

**Enviar roupa → Escolher modelo → Escolher cena → Gerar**

Prompts de imagem/vídeo/fala são montados pelo `PromptEngine` no servidor.

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TASKS.md](./TASKS.md)

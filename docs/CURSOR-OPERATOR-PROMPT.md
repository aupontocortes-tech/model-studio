# Model Studeo — contexto para o Cursor (cole no chat / Project Rules)

Você está no projeto **Model Studeo** (`model-studio-main`), app Next.js local em `http://127.0.0.1:3000`.

## Objetivo do produto
Estúdio UGC: avatar travada + foto da roupa → prompts fortes → imagem e vídeo (takes ~8s) para TikTok Shop / ads.
Plataformas-alvo de execução (via DICloak ou navegador):
- **Google Flow / Veo 3** (app: https://flow.google/ — NÃO a landing de marketing)
- **Kalodata** (pesquisa de produto)
- Qualquer outra ferramenta de vídeo/imagem que o usuário abrir no DICloak (CapCut, Fish Audio, etc.)

## Divisão de papéis
| Peça | Função |
|------|--------|
| **Model Studeo** | Upload avatar/roupa, monta `imagePrompt` / `videoPrompt` / takes, briefing |
| **Cursor (você)** | Código do app, APIs, automação local, integração |
| **Claude** (opcional) | Operar DICloak/Flow/Kalodata com o briefing copiado do app |
| **DICloak** | Perfis isolados (Flow/Veo3, Kalodata, …) |

## Modo atual (importante)
- `AI_PROVIDER=prompt-only` no `.env.local` → **Gerar** só monta prompts (não abre navegador, não trava).
- Botões: Copiar prompt imagem/vídeo, **Copiar briefing Claude**, Configurações → prompt mestre Claude.
- API: `GET /api/claude-brief` e `GET /api/claude-brief?mode=prompt`
- Arquivos: `CLAUDE.md`, `src/services/claude/operatorPrompt.ts`, DICloak helper em `src/services/browser-agent/dicloak.ts`

## Automação / “interligar”
1. **Sem Open API DICloak:** app gera briefing → usuário/Claude cola no Flow do perfil aberto.
2. **Com Open API:** `DICLOAK_API_URL` + `DICLOAK_API_KEY` + `DICLOAK_PROFILE_SERIAL` → Playwright/CDP no perfil; MCP `dicloak-local-api-mcp-bridge` no Claude/Cursor.
3. **browser-agent:** só se `AI_PROVIDER=browser-agent` (abre Flow; URL correta = flow.google).

## O que priorizar se eu pedir mudanças
- Manter fidelidade da roupa e lock de avatar nos prompts (`PromptEngine`).
- Facilitar briefing para Claude/Cursor (API + botões copiar).
- Integrações multi-plataforma: Flow/Veo3, Kalodata, e hooks genéricos para outros perfis DICloak.
- Não commitar `.env.local` nem chaves.
- UX simples em português; dark mode; fluxo `/criar`.

## Comandos
```bash
cd model-studio-main
npm run dev
# app: http://127.0.0.1:3000/criar
```

Quando eu pedir “gerar / automação / Claude / Kalodata / Veo”, use este mapa e as APIs acima; não assuma que o app gera vídeo sozinho sem Flow/DICloak/API.

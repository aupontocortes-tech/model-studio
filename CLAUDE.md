# Model Studeo × Claude

Este repositório é o **Model Studeo** (Next.js em `http://127.0.0.1:3000`).

## Seu papel (Claude)
Operar automação no **DICloak** (Flow/Veo3 + Kalodata) usando os prompts que o studio monta.

## Briefing ao vivo
- Prompt mestre: `GET /api/claude-brief?mode=prompt`
- Pacote da última geração: `GET /api/claude-brief`
- Geração específica: `GET /api/claude-brief?generationId=gen_xxx`

Na UI: **Configurações** ou **Criar** → botões **Copiar prompt Claude** / **Copiar briefing**.

## Fluxo
1. Usuário prepara avatar + roupa em `/criar` e clica Gerar (`AI_PROVIDER=prompt-only`).
2. Você lê o briefing e executa no perfil Flow do DICloak em https://flow.google/
3. Kalodata quando o pacote trouxer `kalodataHint`.

## DICloak MCP (se houver Open API)
Ver https://help.dicloak.com/browser-mcp-server/

```json
{
  "mcpServers": {
    "dicloak-local-api-mcp-bridge": {
      "command": "npx",
      "args": ["dicloak-local-api-mcp-bridge"],
      "env": {
        "DICLOAK_API_KEY": "SUA_CHAVE",
        "DICLOAK_BASE_URL": "http://127.0.0.1:52140/openapi"
      }
    }
  }
}
```

Não use a landing de marketing `labs.google/fx/tools/flow` como workspace — use `https://flow.google/`.

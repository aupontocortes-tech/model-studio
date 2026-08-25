# Model Studeo — Architecture

## Purpose

Application for creating photorealistic virtual models wearing **exactly** the garments supplied by the seller, optimized for vertical TikTok Shop UGC content.

**Priority order:** garment fidelity → character consistency → anatomy → realism → UGC naturalness → commercial potential → creative variety.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19 + Tailwind CSS |
| Storage (v1) | Local JSON + uploads on disk (`data/`) |
| AI (v1) | Mock providers (`AI_PROVIDER=mock`) |
| Config | `.env` / `.env.example` |

Storage and AI are behind interfaces so SQLite/Postgres and real APIs can replace them later without rewriting the UI.

## High-level modules

```
app/                 # Next.js routes (UI + API)
src/
  domain/            # Entities, enums, ProductSpec, CharacterProfile
  pipeline/          # Pipeline stage definitions
  services/
    prompt/          # PromptEngine (image + video + speech)
    ai/              # ImageGenerationProvider / VideoGenerationProvider
    validation/      # GenerationValidator (structural MVP)
    analysis/        # Visual analysis → ProductSpec (heuristic + mock)
  storage/           # Repository interfaces + JSON file implementation
  lib/               # Upload validation, IDs, env
components/          # UI building blocks
```

## Creation pipeline

Each stage is a named code unit (`PipelineStage`):

1. `UPLOAD_PRODUCT` — reference images + labels (front/back/detail/…)
2. `VISUAL_ANALYSIS` — derive draft `ProductSpec`
3. `PRODUCT_SPEC` — user edits / confirms authoritative garment facts
4. `MODEL_CONFIG` — `CharacterProfile` (fixed or random)
5. `IMAGE_PROMPT` — `PromptEngine.buildImagePrompt(...)`
6. `GENERATE_MODEL` — `ImageGenerationProvider.generateFromReferences(...)`
7. `VALIDATION` — `GenerationValidator` (stub scores in mock)
8. `APPROVED_IMAGE` — status → `approved`
9. `VIDEO_PROMPT` — `PromptEngine.buildVideoPrompt(...)`
10. `SPEECH` — optional PT-BR TikTok Shop line (claims-safe)
11. `EXPORT` — copy prompts / metadata

## Core domain objects

- **ProductSpec** — structured garment truth (not free text alone)
- **CharacterProfile** — identity lock (face, hair, body, etc.)
- **SceneConfig** — preset + pose/camera/lighting knobs
- **Product / Character / Project / Generation / ReferenceImage / Prompt / ScenePreset**

## PromptEngine

Single service builds:

```
PRODUCT LOCK + CHARACTER + SCENE + POSE + CAMERA + LIGHTING + REALISM + NEGATIVE
```

Never assemble final prompts in React components.

## AI providers

```ts
interface ImageGenerationProvider {
  generateImage(input): Promise<GenerationResult>
  editImage(input): Promise<GenerationResult>
  generateFromReferences(input): Promise<GenerationResult>
}

interface VideoGenerationProvider {
  generateVideo(input): Promise<GenerationResult>
  generateFromImage(input): Promise<GenerationResult>
}
```

Factory selects `mock` (default) or future `openai` / `replicate` / etc. via `AI_PROVIDER`.

## Reference roles (ready for expansion)

- `PRODUCT_REFERENCE` — garment only
- `CHARACTER_REFERENCE` — person only
- `SCENE_REFERENCE` — environment only
- `POSE_REFERENCE` — pose/framing only

MVP focuses on product references; other roles are typed and UI-ready.

## Data layout (v1)

```
data/
  products.json
  characters.json
  projects.json
  generations.json
uploads/
  products/<productId>/
  characters/<characterId>/
  generations/<generationId>/
```

Repositories implement CRUD; swap implementation later without changing callers.

## Security

- Upload: MIME allowlist, extension allowlist, max size
- API keys only on server (`process.env`)
- No secrets in client bundles or logs
- Uploaded files never executed

## UI map

| Route | Role |
|-------|------|
| `/` | Dashboard |
| `/criar` | Wizard: Produto → Modelo → Cena → Gerar → Vídeo |
| `/produtos` | Product library |
| `/modelos` | Character library |
| `/projetos` | Projects |
| `/historico` | Generations + duplicate / variation |
| `/configuracoes` | Provider, CTA defaults, mock status |

Create screen layout: **left** settings · **center** preview · **right** refs + generation meta.

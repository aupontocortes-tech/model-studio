"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Clapperboard,
  Bot,
  Copy,
  ExternalLink,
  Film,
  ImageIcon,
  Link2,
  LockKeyhole,
  Mic,
  Package,
  Plus,
  Trash2,
  Upload,
  UserRound,
  Video,
  WandSparkles,
} from "lucide-react";
import {
  Button,
  Field,
  PageHeader,
  Panel,
  inputClass,
} from "@/components/ui/primitives";
import { api } from "@/lib/clientApi";
import type {
  Character,
  CharacterCastEntry,
  CtaMode,
  Generation,
  Product,
  VideoTake,
} from "@/domain/types";

type ProductMode = "photos" | "kalodata";

type CastSlot = {
  key: string;
  name: string;
  character: Character | null;
  voiceProfile: string;
  /** Preview local imediato (blob:) enquanto/após upload */
  localPreviewUrl?: string;
};

type OrchStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
};

function suggestTakes(action: string): number {
  if (!action.trim()) return 1;
  const lines = action.split(/\n+/).filter((l) => l.trim().length > 4);
  if (lines.length >= 2) return Math.min(6, lines.length);
  if (action.length > 100) return 2;
  return 1;
}

async function copyText(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CriarPage() {
  const pathname = usePathname();
  const router = useRouter();
  const embedded = pathname !== "/criar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const [projectId, setProjectId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [cast, setCast] = useState<CastSlot[]>([
    { key: "1", name: "Personagem 1", character: null, voiceProfile: "" },
  ]);
  const [sceneFromAvatar, setSceneFromAvatar] = useState(true);

  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [referenceVideoName, setReferenceVideoName] = useState("");
  const [referenceVideoPreview, setReferenceVideoPreview] = useState("");
  const [replicateMotion, setReplicateMotion] = useState(true);
  const [customSpeechScript, setCustomSpeechScript] = useState("");
  const [uploadingKind, setUploadingKind] = useState<
    null | "avatar" | "product" | "video"
  >(null);

  const [productMode, setProductMode] = useState<ProductMode>("photos");
  const [product, setProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productPreviewUrls, setProductPreviewUrls] = useState<string[]>([]);
  const [kalodataHint, setKalodataHint] = useState("");

  const [videoAction, setVideoAction] = useState("");
  const [videoTakes, setVideoTakes] = useState(1);
  const [autoTakes, setAutoTakes] = useState(true);

  const [cta, setCta] = useState<CtaMode>("carrinho_laranja");
  const [withSpeech, setWithSpeech] = useState(true);

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGenId, setSelectedGenId] = useState("");
  const [orchSteps, setOrchSteps] = useState<OrchStep[]>([]);
  const [provider, setProvider] = useState("mock");
  const [kalodataUrl, setKalodataUrl] = useState("");
  const [flowUrl, setFlowUrl] = useState("");

  const primaryCharacter = cast[0]?.character ?? null;
  const primaryPreview =
    cast[0]?.localPreviewUrl || primaryCharacter?.primaryImageUrl || "";
  const hasAvatarPreview = Boolean(primaryPreview);
  const hasAvatarServer = Boolean(primaryCharacter?.primaryImageUrl);
  const hasProductPreview =
    Boolean(product?.references.length) || productPreviewUrls.length > 0;
  const hasProductServer = Boolean(product?.references.length);
  const hasKalodata = Boolean(kalodataHint.trim());
  const productReady =
    productMode === "kalodata" ? hasKalodata : hasProductServer;

  const selectedGen = useMemo(
    () => generations.find((g) => g.id === selectedGenId) || generations[0],
    [generations, selectedGenId],
  );

  const effectiveTakes = autoTakes ? suggestTakes(videoAction) : videoTakes;
  const totalSeconds = effectiveTakes * 8;

  useEffect(() => {
    if (autoTakes) setVideoTakes(suggestTakes(videoAction));
  }, [videoAction, autoTakes]);

  useEffect(() => {
    if (!embedded && pathname === "/criar") {
      router.replace("/gerar?mode=ugc&kind=video");
    }
  }, [embedded, pathname, router]);

  useEffect(() => {
    void (async () => {
      const [p, productsRes, chars, meta] = await Promise.all([
        api.projects.list(),
        api.products.list(),
        api.characters.list(),
        api.meta(),
      ]);
      setProducts(productsRes.products);
      setProvider(meta.provider);
      setKalodataUrl(meta.kalodataUrl);
      setFlowUrl(meta.googleFlowUrl);
      if (p.projects[0]) setProjectId(p.projects[0].id);

      // Restaura o produto selecionado (upload não some ao recarregar)
      const savedProductId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("model-studeo-product-id")
          : null;
      const restored =
        productsRes.products.find((x) => x.id === savedProductId) ||
        productsRes.products.find((x) => x.references?.length > 0) ||
        null;
      if (restored) {
        setProduct(restored);
        setProductName(restored.name);
      }

      const withPhoto = chars.characters.find((c) => c.primaryImageUrl);
      if (withPhoto) {
        setCast([
          {
            key: "1",
            name: withPhoto.name,
            character: withPhoto,
            voiceProfile: withPhoto.voiceProfile || "",
          },
        ]);
      }
    })();
  }, []);

  function updateCast(index: number, patch: Partial<CastSlot>) {
    setCast((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }

  function addCastMember() {
    setCast((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        name: `Personagem ${prev.length + 1}`,
        character: null,
        voiceProfile: "",
      },
    ]);
  }

  function removeCastMember(index: number) {
    if (cast.length <= 1) return;
    setCast((prev) => prev.filter((_, i) => i !== index));
  }

  function buildCharacterCast(): CharacterCastEntry[] {
    return cast
      .filter((s) => s.character)
      .map((s, i) => ({
        characterId: s.character!.id,
        name: s.name.trim() || s.character!.name,
        voiceProfile: s.voiceProfile.trim() || undefined,
        isPrimary: i === 0,
      }));
  }

  function setStep(id: string, status: OrchStep["status"], label?: string) {
    setOrchSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, label: label ?? s.label } : s,
      ),
    );
  }

  async function ensureProject(): Promise<string> {
    if (projectId) return projectId;
    const { project } = await api.projects.create({
      name: `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
    });
    setProjectId(project.id);
    return project.id;
  }

  async function onAvatarUpload(index: number, files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    const localUrl = URL.createObjectURL(file);
    // Mostra na hora — não espera a API
    updateCast(index, { localPreviewUrl: localUrl });
    setBusy(true);
    setUploadingKind("avatar");
    setError("");
    try {
      const pid = await ensureProject();
      const slot = cast[index];
      let current = slot.character;
      if (!current) {
        const { character: created } = await api.characters.create({
          name: slot.name.trim() || `Personagem ${index + 1}`,
          autoGenerate: true,
          lockIdentity: true,
          projectId: pid,
        });
        current = created;
        updateCast(index, { character: created, localPreviewUrl: localUrl });
      }
      const { character: updated } = await api.characters.upload(
        current.id,
        file,
      );
      let finalChar = updated;
      if (slot.voiceProfile.trim()) {
        const { character: withVoice } = await api.characters.update(
          updated.id,
          { voiceProfile: slot.voiceProfile.trim() },
        );
        finalChar = withVoice;
      }
      updateCast(index, {
        character: finalChar,
        localPreviewUrl: localUrl,
      });
      sessionStorage.setItem("model-studeo-character-id", finalChar.id);
      setStatusMsg(
        index === 0
          ? "✓ Avatar adicionada — foto aparece abaixo."
          : `✓ Personagem ${index + 1} adicionada.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `Avatar: ${e.message}`
          : "Falha ao enviar avatar",
      );
    } finally {
      setBusy(false);
      setUploadingKind(null);
    }
  }

  async function onReferenceVideoUpload(files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    const localUrl = URL.createObjectURL(file);
    setReferenceVideoPreview(localUrl);
    setReferenceVideoName(file.name);
    setBusy(true);
    setUploadingKind("video");
    setError("");
    try {
      const { referenceVideo } = await api.referenceVideos.upload(file);
      setReferenceVideoUrl(referenceVideo.url);
      setReplicateMotion(true);
      setStatusMsg("✓ Vídeo modelo adicionado — preview abaixo.");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Vídeo: ${e.message}`
          : "Falha no vídeo de referência",
      );
    } finally {
      setBusy(false);
      setUploadingKind(null);
    }
  }

  async function onProductUpload(files: FileList | null) {
    if (!files?.length) return;
    // FileList é “vivo”: copiar ANTES de await / limpar o input
    const fileList = Array.from(files);
    setBusy(true);
    setUploadingKind("product");
    setError("");

    const localUrls = fileList.map((f) => URL.createObjectURL(f));
    setProductPreviewUrls((prev) => [...prev, ...localUrls]);

    try {
      const pid = await ensureProject();
      let current = product;
      if (!current) {
        const { product: created } = await api.products.create({
          name: productName.trim() || "Produto",
          projectId: pid,
        });
        current = created;
        setProduct(created);
        setProducts((prev) => [created, ...prev]);
      }
      const labels = [
        "modelo_usando",
        "frente",
        "costas",
        "lateral",
        "detalhe",
        "produto_isolado",
        "referencia_adicional",
      ] as const;
      let i = current.references.length;
      for (const file of fileList) {
        const label = labels[Math.min(i, labels.length - 1)];
        const res = await api.products.upload(current.id, file, label);
        current = res.product;
        i += 1;
      }
      if (!current.references.length) {
        throw new Error(
          "A foto não foi salva. Tente de novo (JPG ou PNG).",
        );
      }
      setProduct({ ...current });
      setProductName(current.name);
      setProducts((prev) => {
        const others = prev.filter((p) => p.id !== current!.id);
        return [current!, ...others];
      });
      sessionStorage.setItem("model-studeo-product-id", current.id);
      setStatusMsg(
        `✓ Roupa adicionada — ${current.references.length} foto(s) abaixo.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? `Roupa: ${e.message}` : "Falha no upload",
      );
    } finally {
      setBusy(false);
      setUploadingKind(null);
    }
  }

  async function openKalodata() {
    setBusy(true);
    try {
      await api.agent.start({
        action: "kalodata",
        productName: kalodataHint.trim() || productName.trim() || undefined,
      });
      setStatusMsg("Kalodata aberto no navegador do agente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir Kalodata");
    } finally {
      setBusy(false);
    }
  }

  async function generateAll() {
    setBusy(true);
    setError("");
    setStatusMsg("");

    const steps: OrchStep[] = [
      { id: "avatar", label: "Travar avatar (corpo + rosto)", status: "pending" },
      { id: "product", label: "Preparar roupa", status: "pending" },
      { id: "image", label: "Gerar imagem com a roupa", status: "pending" },
      { id: "video", label: `Montar ${effectiveTakes} take(s) de vídeo (8s)`, status: "pending" },
    ];
    setOrchSteps(steps);

    try {
      setStep("avatar", "running");
      if (!primaryCharacter?.id || !primaryCharacter.primaryImageUrl) {
        throw new Error("Envie a foto da avatar principal (Personagem 1).");
      }

      for (const slot of cast) {
        if (!slot.character) continue;
        await api.characters.update(slot.character.id, {
          name: slot.name.trim() || slot.character.name,
          voiceProfile: slot.voiceProfile.trim() || undefined,
          lockIdentity: true,
        });
      }
      setStep("avatar", "done", `${cast.filter((c) => c.character).length} personagem(ns)`);

      setStep("product", "running");
      const pid = await ensureProject();
      let currentProduct = product;

      if (productMode === "kalodata") {
        if (!kalodataHint.trim()) {
          throw new Error("Indique o produto no Kalodata.");
        }
        if (!currentProduct) {
          const { product: created } = await api.products.create({
            name: productName.trim() || kalodataHint.slice(0, 60),
            commercialInfo: `Kalodata: ${kalodataHint.trim()}`,
            projectId: pid,
          });
          currentProduct = created;
          setProduct(created);
        }
        try {
          await api.agent.start({
            action: "kalodata",
            productName: kalodataHint.trim(),
          });
        } catch {
          /* agent optional */
        }
      } else {
        if (!currentProduct?.references.length) {
          throw new Error("Envie foto(s) da roupa.");
        }
        const { product: analyzed } = await api.products.analyze(
          currentProduct.id,
        );
        currentProduct = analyzed;
        setProduct(analyzed);
      }
      setStep("product", "done");

      const characterCast = buildCharacterCast();

      setStep("image", "running");
      const { generations: gens } = await api.generations.create({
        productId: currentProduct!.id,
        characterId: primaryCharacter.id,
        projectId: pid,
        lockCharacter: true,
        variationCount: 1,
        withSpeech,
        cta,
        sceneFromAvatar,
        kalodataHint:
          productMode === "kalodata" ? kalodataHint.trim() : undefined,
        videoAction: videoAction.trim() || undefined,
        videoTakes: effectiveTakes,
        referenceVideoUrl: referenceVideoUrl || undefined,
        replicateMotionFromVideo: replicateMotion && Boolean(referenceVideoUrl),
        characterCast,
        customSpeechScript: customSpeechScript.trim() || undefined,
      });
      setGenerations(gens);
      setSelectedGenId(gens[0]?.id || "");
      setStep("image", "done");

      setStep("video", "running");
      let gen = gens[0];
      if (gen) {
        const approved = await api.generations.patch(gen.id, {
          action: "approve",
        });
        gen = approved.generation;
        const withVideo = await api.generations.patch(gen.id, {
          action: "video_prompt",
          videoStyle: sceneFromAvatar ? "mirror_selfie" : "apresentacao",
          withSpeech,
          videoAction: videoAction.trim() || undefined,
          videoTakes: effectiveTakes,
          referenceVideoUrl: referenceVideoUrl || undefined,
          replicateMotionFromVideo:
            replicateMotion && Boolean(referenceVideoUrl),
          characterCast,
          customSpeechScript: customSpeechScript.trim() || undefined,
        });
        gen = withVideo.generation;
        setGenerations([gen]);
        setSelectedGenId(gen.id);
      }
      setStep("video", "done", `${effectiveTakes} take(s) · ${totalSeconds}s total`);
      setStatusMsg(
        `Prompt pronto (${effectiveTakes} take(s)). Copie abaixo e cole no Flow (https://flow.google) no DICloak — anexe as fotos.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na geração");
      setOrchSteps((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "error" } : s,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const canGenerate = hasAvatarServer && productReady;

  const checklist = [
    {
      id: "avatar",
      label: "1. Foto da avatar",
      done: hasAvatarPreview,
      required: true,
      saving: hasAvatarPreview && !hasAvatarServer,
    },
    {
      id: "roupa",
      label:
        productMode === "kalodata"
          ? "2. Produto no Kalodata"
          : "2. Foto da roupa",
      done:
        productMode === "kalodata" ? hasKalodata : hasProductPreview,
      required: true,
      saving: hasProductPreview && !hasProductServer && productMode === "photos",
    },
    {
      id: "acao",
      label: "3. Ação do vídeo (opcional)",
      done: Boolean(videoAction.trim()),
      required: false,
      saving: false,
    },
    {
      id: "fala",
      label: "4. Fala / voz (opcional)",
      done: Boolean(customSpeechScript.trim()),
      required: false,
      saving: false,
    },
  ];

  const missingForGenerate = checklist
    .filter((c) => c.required && !(c.id === "avatar" ? hasAvatarServer : c.id === "roupa" ? productReady : c.done))
    .map((c) => c.label.replace(/^\d+\.\s*/, ""));

  const takes: VideoTake[] =
    selectedGen?.videoTakes || selectedGen?.config.videoTakePlans || [];

  async function copyForVeo(label: string, text: string) {
    const ok = await copyText(text);
    setCopyMsg(
      ok
        ? `${label} copiado — cole no Flow / Veo3 (e anexe as fotos de referência).`
        : "Não deu pra copiar. Selecione o texto e use Ctrl+C.",
    );
  }

  async function copyClaudeBriefing() {
    const okPack = await api
      .claudeBrief({
        generationId: selectedGen?.id,
      })
      .then(async (data) => {
        const text = data.fullBriefing || data.markdown || "";
        return copyText(text);
      })
      .catch(() => false);
    setCopyMsg(
      okPack
        ? "Briefing Claude copiado — cole no chat do Claude e peça para executar no Flow/Kalodata."
        : "Falha ao montar briefing Claude.",
    );
  }

  if (!embedded && pathname === "/criar") {
    return (
      <p className="text-sm text-[var(--muted)]">
        Abrindo Criar · Vídeo avançado…
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title={embedded ? "Vídeo avançado" : "Estúdio"}
        subtitle="Avatar travada · roupa · imagem · vídeo com takes de 8 segundos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
              {provider}
            </span>
            {kalodataUrl ? (
              <a
                href={kalodataUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]"
              >
                Kalodata <ExternalLink size={12} />
              </a>
            ) : null}
            {flowUrl ? (
              <a
                href={flowUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]"
              >
                Flow / Veo <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {statusMsg ? (
        <p className="mb-4 rounded-xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success-text)]">
          {statusMsg}
        </p>
      ) : null}

      {/* Checklist bem visível */}
      <section className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--ink)]">
            Para gerar, só precisa de 2 coisas
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              canGenerate
                ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                : "bg-[var(--panel-elevated)] text-[var(--muted)]"
            }`}
          >
            {canGenerate
              ? "Pronto para gerar"
              : `Falta: ${missingForGenerate.join(" e ")}`}
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                item.done
                  ? "border-[var(--ok)]/40 bg-[var(--success-bg)] text-[var(--success-text)]"
                  : item.required
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-[var(--line)] bg-[var(--panel-elevated)] text-[var(--muted)]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  item.done
                    ? "bg-[var(--ok)] text-white"
                    : "bg-[var(--panel)] text-[var(--muted)]"
                }`}
              >
                {item.done ? <Check size={12} strokeWidth={3} /> : "!"}
              </span>
              <span className="font-medium">{item.label}</span>
              <span className="ml-auto text-[11px] opacity-80">
                {item.saving
                  ? "salvando…"
                  : item.done
                    ? "ok"
                    : item.required
                      ? "obrigatório"
                      : "opcional"}
              </span>
            </li>
          ))}
        </ul>
        {hasAvatarPreview || hasProductPreview ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hasAvatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryPreview}
                alt="Avatar"
                className="h-16 w-12 rounded-lg object-cover ring-2 ring-[var(--ok)]"
              />
            ) : null}
            {(product?.references[0]?.url || productPreviewUrls[0]) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={productPreviewUrls[0] || product!.references[0].url}
                alt="Roupa"
                className="h-16 w-12 rounded-lg object-cover ring-2 ring-[var(--ok)]"
              />
            )}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* —— ENTRADAS —— */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Entradas
          </h2>

          <Panel
            title="1. Elenco (avatars)"
            description="Personagem 1 é a principal. Adicione quantas precisar — cada uma com voz única."
          >
            <div className="space-y-4">
              {cast.map((slot, index) => (
                <div
                  key={slot.key}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Field label={index === 0 ? "Principal" : `Personagem ${index + 1}`}>
                      <input
                        className={inputClass}
                        value={slot.name}
                        onChange={(e) =>
                          updateCast(index, { name: e.target.value })
                        }
                        placeholder={`Personagem ${index + 1}`}
                      />
                    </Field>
                    {index > 0 ? (
                      <button
                        type="button"
                        aria-label="Remover personagem"
                        className="mt-6 rounded-lg p-2 text-[var(--muted)] hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => removeCastMember(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      slot.localPreviewUrl || slot.character?.primaryImageUrl
                        ? "border-[var(--ok)] bg-[var(--success-bg)]"
                        : "border-dashed border-[var(--line)]"
                    }`}
                  >
                    {slot.localPreviewUrl || slot.character?.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          slot.localPreviewUrl ||
                          slot.character!.primaryImageUrl
                        }
                        alt={slot.name}
                        className="h-24 w-16 rounded-lg object-cover ring-2 ring-[var(--ok)]"
                      />
                    ) : (
                      <UserRound size={22} className="text-[var(--accent)]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {uploadingKind === "avatar" && busy
                          ? "Enviando…"
                          : slot.localPreviewUrl ||
                              slot.character?.primaryImageUrl
                            ? "Trocar foto"
                            : "Toque aqui e escolha a foto"}
                      </span>
                      {slot.localPreviewUrl ||
                      slot.character?.primaryImageUrl ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--success-text)]">
                          <Check size={11} strokeWidth={3} />
                          Adicionada — aparece aqui
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-amber-200/90">
                          Obrigatório para gerar
                        </span>
                      )}
                    </span>
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                      onChange={(e) => {
                        void onAvatarUpload(index, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <Field
                    label="Voz desta personagem"
                    hint="Tom, sotaque, velocidade — único por personagem."
                  >
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={slot.voiceProfile}
                      onChange={(e) =>
                        updateCast(index, { voiceProfile: e.target.value })
                      }
                      placeholder="Ex.: voz jovem, carioca, ritmo rápido e animado"
                    />
                  </Field>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={addCastMember}
            >
              <Plus size={16} />
              Adicionar personagem
            </Button>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--info-bg)] p-3 text-xs leading-5 text-[var(--info-text)]">
              <LockKeyhole size={14} className="mt-0.5 shrink-0" />
              A principal trava corpo e rosto. As outras entram no roteiro/voz.
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={sceneFromAvatar}
                onChange={(e) => setSceneFromAvatar(e.target.checked)}
              />
              <span>
                <span className="font-medium">Cenário já está na foto</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Mantém o fundo da avatar principal.
                </span>
              </span>
            </label>
          </Panel>

          <Panel
            title="Vídeo modelo (replicar movimento)"
            description="Envie um vídeo de referência — o agente copia a ação para sua avatar."
          >
            {(referenceVideoPreview || referenceVideoUrl) ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-[var(--ok)] bg-[var(--success-bg)] p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--success-text)]">
                  <Check size={14} strokeWidth={3} />
                  Vídeo adicionado
                  {referenceVideoName ? (
                    <span className="truncate font-normal text-[var(--muted)]">
                      · {referenceVideoName}
                    </span>
                  ) : null}
                </div>
                <video
                  src={referenceVideoPreview || referenceVideoUrl}
                  controls
                  className="max-h-48 w-full rounded-lg bg-black"
                />
              </div>
            ) : null}
            <label
              className={`flex cursor-pointer flex-col items-center rounded-2xl border py-6 ${
                referenceVideoUrl
                  ? "border-[var(--line)] bg-[var(--panel-elevated)]"
                  : "border-dashed border-[var(--line)] bg-[var(--panel-elevated)]"
              }`}
            >
              <Video size={22} className="text-[var(--accent)]" />
              <span className="mt-2 text-sm font-semibold">
                {uploadingKind === "video" && busy
                  ? "Enviando vídeo…"
                  : referenceVideoUrl
                    ? "Trocar vídeo modelo"
                    : "Enviar vídeo modelo"}
              </span>
              <span className="mt-1 text-xs text-[var(--muted)]">
                MP4, WEBM ou MOV
              </span>
              <input
                className="sr-only"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  void onReferenceVideoUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={replicateMotion}
                disabled={!referenceVideoUrl}
                onChange={(e) => setReplicateMotion(e.target.checked)}
              />
              Replicar movimento do vídeo na avatar principal
            </label>
          </Panel>

          <Panel
            title="2. Roupa"
            description="Pode ser a peça sozinha OU uma foto de alguém vestindo essa roupa (o app copia a peça para a sua avatar)."
          >
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProductMode("photos")}
                className={`rounded-xl border p-3 text-left text-sm ${
                  productMode === "photos"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--panel-elevated)]"
                }`}
              >
                <Package size={16} className="text-[var(--accent)]" />
                <span className="mt-2 block font-semibold">Fotos</span>
              </button>
              <button
                type="button"
                onClick={() => setProductMode("kalodata")}
                className={`rounded-xl border p-3 text-left text-sm ${
                  productMode === "kalodata"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--panel-elevated)]"
                }`}
              >
                <Link2 size={16} className="text-[var(--accent)]" />
                <span className="mt-2 block font-semibold">Kalodata</span>
              </button>
            </div>

            <Field label="Nome (opcional)">
              <input
                className={inputClass}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Vestido midi preto"
              />
            </Field>

            {productMode === "photos" ? (
              <>
                <Field label="Produto cadastrado">
                  <select
                    className={inputClass}
                    value={product?.id || ""}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      setProduct(p || null);
                      if (p) {
                        setProductName(p.name);
                        sessionStorage.setItem("model-studeo-product-id", p.id);
                      } else {
                        sessionStorage.removeItem("model-studeo-product-id");
                      }
                      setProductPreviewUrls([]);
                    }}
                  >
                    <option value="">Novo…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.references.length
                          ? ` · ${p.references.length} foto(s)`
                          : " · sem foto"}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="mt-3 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-elevated)] py-6">
                  <Upload size={20} className="text-[var(--accent)]" />
                  <span className="mt-2 text-sm font-semibold">
                    {uploadingKind === "product" && busy
                      ? "Enviando fotos…"
                      : product?.references.length
                        ? "Adicionar mais fotos"
                        : "Enviar fotos da roupa"}
                  </span>
                  <span className="mt-1 max-w-xs text-center text-xs text-[var(--muted)]">
                    Peça isolada ou pessoa vestindo — a referência é a roupa
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                    multiple
                    onChange={(e) => {
                      void onProductUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                {(product?.references.length || productPreviewUrls.length) ? (
                  <div className="mt-3 rounded-xl border border-[var(--ok)] bg-[var(--success-bg)] p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--success-text)]">
                      <Check size={14} strokeWidth={3} />
                      Roupa adicionada ·{" "}
                      {Math.max(
                        product?.references.length || 0,
                        productPreviewUrls.length,
                      )}{" "}
                      foto(s) — aparece aqui
                    </p>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {productPreviewUrls.map((url) => (
                        <li key={url} className="min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Roupa"
                            className="aspect-[3/4] w-full rounded-lg object-cover ring-2 ring-[var(--ok)]"
                          />
                          <p className="mt-1 truncate text-[10px] text-[var(--success-text)]">
                            adicionada
                          </p>
                        </li>
                      ))}
                      {!productPreviewUrls.length &&
                        product?.references
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((ref) => (
                            <li key={ref.id} className="min-w-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ref.url}
                                alt={String(ref.label)}
                                className="aspect-[3/4] w-full rounded-lg object-cover ring-1 ring-[var(--line)]"
                              />
                              <p className="mt-1 truncate text-[10px] text-[var(--muted)]">
                                {String(ref.label).replaceAll("_", " ")}
                              </p>
                            </li>
                          ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-200/90">
                    Obrigatório — toque em “Enviar fotos da roupa” acima.
                  </p>
                )}
              </>
            ) : (
              <>
                <Field label="Onde está no Kalodata">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={kalodataHint}
                    onChange={(e) => setKalodataHint(e.target.value)}
                    placeholder="Link ou nome do produto"
                  />
                </Field>
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  loading={busy}
                  onClick={() => void openKalodata()}
                >
                  Abrir Kalodata
                </Button>
              </>
            )}
          </Panel>

          <Panel
            title="3. Ação + fala do vídeo"
            description="Ação visual em takes de 8s. Cole a fala se quiser voz no vídeo."
          >
            <Field
              label="Ação visual (frames / takes)"
              hint="Uma linha por take de 8s, ou texto longo — o app organiza."
            >
              <textarea
                className={inputClass}
                rows={3}
                value={videoAction}
                onChange={(e) => setVideoAction(e.target.value)}
                placeholder={`Mostra a roupa de frente\nGira de lado\nAjusta a barra`}
              />
            </Field>

            <Field
              label="Fala do vídeo (colar roteiro)"
              hint="O que ela fala — entra no prompt com os perfis de voz."
            >
              <textarea
                className={inputClass}
                rows={3}
                value={customSpeechScript}
                onChange={(e) => setCustomSpeechScript(e.target.value)}
                placeholder="Olha esse caimento… toca no carrinho laranja!"
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3 text-sm">
              <Mic size={16} className="text-[var(--accent)]" />
              <span className="flex-1">Incluir fala/voz no vídeo</span>
              <input
                type="checkbox"
                checked={withSpeech}
                onChange={(e) => setWithSpeech(e.target.checked)}
              />
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3 text-sm">
              <input
                type="checkbox"
                checked={autoTakes}
                onChange={(e) => setAutoTakes(e.target.checked)}
              />
              <span>
                Takes automáticos ({effectiveTakes} × 8s = {totalSeconds}s)
              </span>
            </label>

            {!autoTakes ? (
              <Field label="Quantidade de takes (8s)">
                <select
                  className={inputClass}
                  value={videoTakes}
                  onChange={(e) => setVideoTakes(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} take(s) — {n * 8}s
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="CTA">
              <select
                className={inputClass}
                value={cta}
                onChange={(e) => setCta(e.target.value as CtaMode)}
              >
                <option value="carrinho_laranja">Carrinho laranja</option>
                <option value="conferir_produto">Conferir produto</option>
                <option value="oferta">Oferta</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </Field>

            <Button
              className="mt-4 w-full"
              loading={busy}
              disabled={!canGenerate}
              onClick={() => void generateAll()}
            >
              <WandSparkles size={16} />
              Gerar imagem + vídeo
            </Button>
            {!canGenerate ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Falta obrigatório: {missingForGenerate.join(" · ")}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--success-text)]">
                Pronto para gerar: avatar + roupa ok. O resto é opcional.
              </p>
            )}

            {selectedGen?.imagePrompt ? (
              <div className="mt-4 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3">
                <p className="text-sm font-medium text-[var(--ink)]">
                  Colar no Flow / Veo3 (manual)
                </p>
                <p className="text-[11px] leading-4 text-[var(--muted)]">
                  1) Copie o prompt · 2) No DICloak abra Flow/Veo3 · 3) Cole o
                  texto e anexe as fotos do avatar + roupa · 4) Gere.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void copyForVeo("Prompt da imagem", selectedGen.imagePrompt)
                    }
                  >
                    <Copy size={14} />
                    Copiar prompt imagem
                  </Button>
                  {selectedGen.negativePrompt ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void copyForVeo(
                          "Negative",
                          selectedGen.negativePrompt,
                        )
                      }
                    >
                      <Copy size={14} />
                      Copiar negative
                    </Button>
                  ) : null}
                  {selectedGen.videoPrompt ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void copyForVeo(
                          "Prompt do vídeo",
                          selectedGen.videoPrompt || "",
                        )
                      }
                    >
                      <Copy size={14} />
                      Copiar prompt vídeo
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => void copyClaudeBriefing()}
                  >
                    <Bot size={14} />
                    Copiar briefing Claude
                  </Button>
                </div>
                {copyMsg ? (
                  <p className="text-xs text-[var(--success-text)]">{copyMsg}</p>
                ) : null}
              </div>
            ) : null}
          </Panel>

          {orchSteps.length > 0 ? (
            <Panel title="Progresso">
              <ol className="space-y-2">
                {orchSteps.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] px-3 py-2"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        s.status === "done"
                          ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                          : s.status === "running"
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--panel)] text-[var(--muted)]"
                      }`}
                    >
                      {s.status === "done" ? (
                        <Check size={12} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="text-sm">{s.label}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : null}
        </div>

        {/* —— SAÍDAS —— */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Saídas
          </h2>

          <Panel
            title="Imagem com a roupa"
            description="Avatar vestindo o produto — referência para o vídeo."
          >
            <div className="subtle-grid flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[#0b0c10] p-4">
              <div className="relative aspect-[9/16] h-[300px] overflow-hidden rounded-xl ring-1 ring-[var(--line)]">
                {selectedGen?.resultImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedGen.resultImageUrl}
                    alt="Imagem gerada"
                    className="h-full w-full object-contain"
                  />
                ) : primaryPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryPreview}
                    alt="Avatar"
                    className="h-full w-full object-contain opacity-80"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-[var(--muted)]">
                    <ImageIcon size={28} />
                    <p className="mt-2 text-sm">Aguardando geração</p>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  {selectedGen?.status || "preview"}
                </span>
              </div>
            </div>
            {selectedGen?.speechScript ? (
              <p className="mt-3 rounded-xl bg-[var(--info-bg)] p-3 text-sm text-[var(--info-text)]">
                {selectedGen.speechScript}
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Vídeo — takes de 8 segundos"
            description={`${takes.length || effectiveTakes} take(s) · Flow / Veo`}
          >
            {takes.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-[var(--muted)]">
                <Film size={24} />
                <p className="mt-2 text-sm">
                  Takes aparecem após gerar ({effectiveTakes} × 8s)
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {takes.map((t) => (
                  <li
                    key={t.index}
                    className="rounded-xl border border-[var(--line)] bg-[var(--panel-elevated)] p-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clapperboard size={14} className="text-[var(--accent)]" />
                      Take {t.index} · 8s
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t.action}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-[var(--accent)]">
                        Ver prompt
                      </summary>
                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-[var(--muted)]">
                        {t.prompt}
                      </pre>
                      <Button
                        className="mt-2"
                        variant="secondary"
                        onClick={() =>
                          void copyForVeo(`Take ${t.index}`, t.prompt)
                        }
                      >
                        <Copy size={14} />
                        Copiar take {t.index}
                      </Button>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {selectedGen?.videoPrompt ? (
              <details className="mt-3 rounded-xl border border-[var(--line)] p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Prompt completo (todos os takes)
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] text-[var(--muted)]">
                  {selectedGen.videoPrompt}
                </pre>
                <Button
                  className="mt-2"
                  variant="secondary"
                  onClick={() =>
                    void copyForVeo(
                      "Prompt completo",
                      selectedGen.videoPrompt || "",
                    )
                  }
                >
                  <Copy size={14} />
                  Copiar tudo pro Veo3
                </Button>
              </details>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}

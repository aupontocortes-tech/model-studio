import type { ProductSpec } from "@/domain/types";
import { emptyProductSpec } from "@/domain/types";

/** Heuristic / mock visual analysis — replace with vision model later. */
export function analyzeProductReferences(input: {
  productName: string;
  category?: string;
  commercialInfo?: string;
  labels: string[];
}): ProductSpec {
  const spec = emptyProductSpec();
  const text = `${input.productName} ${input.category || ""} ${input.commercialInfo || ""}`.toLowerCase();

  spec.category = input.category || inferCategory(text);
  spec.product_type = inferProductType(text, spec.category);
  spec.main_color = inferColor(text) || "conforme referência visual";
  spec.material = inferMaterial(text) || "conforme textura da referência";
  spec.texture = "conforme imagem de referência";
  spec.fit = inferFit(text) || "conforme modelagem da referência";
  spec.length = inferLength(text) || "conforme comprimento na referência";
  spec.sleeves = text.includes("manga") ? "conforme referência" : "conforme referência";
  spec.neckline = "conforme referência";
  spec.waist = "conforme referência";
  spec.closure = "somente se visível na referência";
  spec.pockets = text.includes("bolso")
    ? "bolsos conforme referência"
    : "sem bolsos inventados — somente se visíveis";
  spec.print = text.includes("estampa")
    ? "estampa conforme referência"
    : "lisa ou conforme referência";
  spec.visible_branding = "somente logos/símbolos realmente visíveis na referência";
  spec.important_details = [
    "Preservar cor e tonalidade exatas da referência",
    "Preservar modelagem, comprimento e caimento",
    "Preservar costuras, gola, mangas e acabamentos visíveis",
  ];
  if (input.labels.includes("costas")) {
    spec.important_details.push("Incluir detalhes das costas conforme Imagem Costas");
  }
  if (input.labels.includes("detalhe")) {
    spec.important_details.push("Preservar textura/detalhe de tecido da Imagem Detalhe");
  }
  spec.must_preserve = [
    "cor",
    "tonalidade",
    "modelagem",
    "comprimento",
    "tecido/textura",
    "costuras e acabamentos visíveis",
    "estampas e aplicações existentes",
    "quantidade de peças do conjunto",
  ];
  return spec;
}

function inferCategory(text: string): string {
  if (/(vestido|dress)/.test(text)) return "vestido";
  if (/(conjunto|set)/.test(text)) return "conjunto";
  if (/(calça|pants|legging)/.test(text)) return "calça";
  if (/(blusa|top|camisa|cropped)/.test(text)) return "blusa";
  if (/(saia|skirt)/.test(text)) return "saia";
  if (/(shorts)/.test(text)) return "shorts";
  return "roupa feminina";
}

function inferProductType(text: string, category: string): string {
  const match = text.match(
    /\b(vestido|conjunto|calça|blusa|cropped|camisa|saia|shorts|macacão)(?:\s+\w+){0,3}/i,
  );
  if (match) return match[0].trim().toLowerCase();
  return category || "roupa feminina";
}

function inferColor(text: string): string {
  const colors = [
    "preto",
    "branco",
    "bege",
    "marrom",
    "azul",
    "verde",
    "vermelho",
    "rosa",
    "cinza",
    "off-white",
    "nude",
  ];
  return colors.find((c) => text.includes(c)) || "";
}

function inferMaterial(text: string): string {
  if (/(linho)/.test(text)) return "linho";
  if (/(algodão|algodao)/.test(text)) return "algodão";
  if (/(jeans|denim)/.test(text)) return "jeans/denim";
  if (/(malha)/.test(text)) return "malha";
  if (/(cetim)/.test(text)) return "cetim";
  return "";
}

function inferFit(text: string): string {
  if (/(oversized)/.test(text)) return "oversized";
  if (/(slim|ajustad)/.test(text)) return "ajustado";
  if (/(solt)/.test(text)) return "solto";
  return "";
}

function inferLength(text: string): string {
  if (/(mini)/.test(text)) return "mini";
  if (/(midi)/.test(text)) return "midi";
  if (/(longo|max)/.test(text)) return "longo";
  if (/(crop)/.test(text)) return "cropped";
  return "";
}

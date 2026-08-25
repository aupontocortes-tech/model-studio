export type ValidationCategory =
  | "PRODUCT_MATCH"
  | "CHARACTER_MATCH"
  | "ANATOMY"
  | "SCENE"
  | "QUALITY";

export interface ValidationFinding {
  category: ValidationCategory;
  severity: "info" | "warning" | "error";
  message: string;
  score?: number;
}

export interface ValidationResult {
  passed: boolean;
  overallScore: number;
  findings: ValidationFinding[];
}

export interface GenerationValidator {
  validate(input: {
    referenceImageUrls: string[];
    resultImageUrl?: string;
    productLocked: boolean;
    characterLocked: boolean;
  }): Promise<ValidationResult>;
}

/** Structural stub — ready for vision-model comparison later. */
export class StubGenerationValidator implements GenerationValidator {
  async validate(input: {
    referenceImageUrls: string[];
    resultImageUrl?: string;
    productLocked: boolean;
    characterLocked: boolean;
  }): Promise<ValidationResult> {
    const findings: ValidationFinding[] = [
      {
        category: "PRODUCT_MATCH",
        severity: "info",
        message:
          "Validação automática de fidelidade do produto pendente de modelo de visão. Trate a referência como autoritativa.",
        score: input.referenceImageUrls.length ? 0.7 : 0.4,
      },
      {
        category: "CHARACTER_MATCH",
        severity: "info",
        message: input.characterLocked
          ? "Identidade marcada como travada — comparar rosto/cabelo/corpo nas próximas iterações."
          : "Personagem variável nesta geração.",
        score: 0.7,
      },
      {
        category: "ANATOMY",
        severity: "info",
        message: "Checagem de mãos/dedos/membros preparada para integração futura.",
        score: 0.7,
      },
      {
        category: "SCENE",
        severity: "info",
        message: "Cena não valida produto; apenas contexto visual.",
        score: 0.8,
      },
      {
        category: "QUALITY",
        severity: input.resultImageUrl ? "info" : "warning",
        message: input.resultImageUrl
          ? "Resultado presente (mock ou provider)."
          : "Sem imagem de resultado ainda.",
        score: input.resultImageUrl ? 0.75 : 0.3,
      },
    ];

    const overallScore =
      findings.reduce((acc, f) => acc + (f.score ?? 0), 0) / findings.length;

    return {
      passed: overallScore >= 0.5,
      overallScore,
      findings,
    };
  }
}

export const generationValidator = new StubGenerationValidator();

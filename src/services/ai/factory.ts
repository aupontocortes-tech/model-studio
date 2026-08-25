import { getEnv } from "@/lib/env";
import {
  BrowserAgentImageProvider,
  BrowserAgentVideoProvider,
} from "@/services/ai/BrowserAgentProvider";
import { MockImageGenerationProvider } from "@/services/ai/MockImageProvider";
import { MockVideoGenerationProvider } from "@/services/ai/MockVideoProvider";
import {
  PromptOnlyImageProvider,
  PromptOnlyVideoProvider,
} from "@/services/ai/PromptOnlyProvider";
import type {
  ImageGenerationProvider,
  VideoGenerationProvider,
} from "@/services/ai/types";

export function getImageProvider(): ImageGenerationProvider {
  const { aiProvider } = getEnv();
  switch (aiProvider) {
    case "prompt-only":
    case "manual":
    case "manual-flow":
      return new PromptOnlyImageProvider();
    case "browser-agent":
    case "browser":
    case "flow":
      return new BrowserAgentImageProvider();
    case "mock":
    default:
      return new MockImageGenerationProvider();
  }
}

export function getVideoProvider(): VideoGenerationProvider {
  const { aiProvider } = getEnv();
  switch (aiProvider) {
    case "prompt-only":
    case "manual":
    case "manual-flow":
      return new PromptOnlyVideoProvider();
    case "browser-agent":
    case "browser":
    case "flow":
      return new BrowserAgentVideoProvider();
    case "mock":
    default:
      return new MockVideoGenerationProvider();
  }
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Model Studeo",
    short_name: "Studeo",
    description:
      "Studio criativo para modelos virtuais, looks e geração UGC para TikTok Shop.",
    start_url: "/gerar",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f4ff",
    theme_color: "#6d4aff",
    lang: "pt-BR",
    categories: ["productivity", "photo", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}

import type { ScenePreset, ScenePresetId } from "@/domain/types";

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "mirror_selfie",
    name: "Mirror Selfie",
    description: "Full-length mirror selfie in a realistic bedroom (UGC).",
    sceneText:
      "Standing in front of a full-length bedroom mirror in a lived-in residential room. Authentic UGC aesthetic.",
    poseText:
      "Holding a smartphone, mirror selfie pose, full outfit clearly visible from head to toe.",
    cameraText:
      "Vertical 9:16 smartphone camera looking into the mirror, slight handheld imperfection.",
    lightingText:
      "Natural residential room lighting, soft window light, realistic shadows.",
  },
  {
    id: "quarto_creator",
    name: "Quarto / Creator",
    description: "Creator facing the camera in a real bedroom.",
    sceneText:
      "Realistic bedroom creator setup, casual home environment, no studio backdrop.",
    poseText:
      "Facing the camera directly, relaxed standing pose presenting the outfit.",
    cameraText:
      "Vertical 9:16 front-facing smartphone camera at chest-to-full-body framing.",
    lightingText: "Warm residential indoor lighting, natural exposure.",
  },
  {
    id: "sala",
    name: "Sala",
    description: "Modern realistic living room.",
    sceneText:
      "Modern realistic residential living room with believable furniture and depth.",
    poseText: "Natural standing pose, outfit fully visible.",
    cameraText: "Vertical 9:16 smartphone framing, mid-distance.",
    lightingText: "Daylight from windows mixed with soft indoor light.",
  },
  {
    id: "closet",
    name: "Closet",
    description: "Near a mirror or closet area.",
    sceneText:
      "Near a closet or dressing mirror in a realistic home wardrobe area.",
    poseText: "Slight turn to show silhouette and garment fit.",
    cameraText: "Vertical 9:16 smartphone framing emphasizing outfit fit.",
    lightingText: "Indoor closet lighting with soft shadows.",
  },
  {
    id: "street_style",
    name: "Street Style",
    description: "Urban outdoor environment.",
    sceneText:
      "Realistic urban street environment, sidewalk or quiet city corner.",
    poseText: "Casual street-style standing pose, natural posture.",
    cameraText: "Vertical 9:16 smartphone street photography framing.",
    lightingText: "Natural daylight, authentic outdoor shadows.",
  },
  {
    id: "product_focus",
    name: "Product Focus",
    description: "Framing that prioritizes garment and drape.",
    sceneText:
      "Neutral realistic indoor background that does not compete with the garment.",
    poseText:
      "Pose optimized to show garment cut, drape, length and construction clearly.",
    cameraText:
      "Vertical 9:16 framing focused on clothing fit and fabric detail.",
    lightingText:
      "Even natural lighting that reveals fabric texture without studio gloss.",
  },
];

export function getScenePreset(id: ScenePresetId): ScenePreset {
  return SCENE_PRESETS.find((s) => s.id === id) ?? SCENE_PRESETS[0];
}

import type { CharacterProfile } from "@/domain/types";

const pick = <T>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

export function createRandomCharacterProfile(seed = Date.now()): CharacterProfile {
  return {
    apparentAge: pick(["24", "26", "28", "30", "32"], seed),
    skinTone: pick(
      [
        "fair with natural undertone",
        "light-medium olive",
        "medium warm brown",
        "deep brown",
        "tan golden",
      ],
      seed + 1,
    ),
    faceShape: pick(
      ["oval", "heart", "soft square", "round", "oblong"],
      seed + 2,
    ),
    eyeColor: pick(
      ["dark brown", "hazel", "green-brown", "black-brown", "soft gray-green"],
      seed + 3,
    ),
    eyeShape: pick(
      ["almond", "slightly hooded", "round", "upturned"],
      seed + 4,
    ),
    hairStyle: pick(
      ["loose waves", "straight center part", "soft curls", "low pony with face framing", "shoulder tuck"],
      seed + 5,
    ),
    hairLength: pick(
      ["shoulder length", "mid-back", "collarbone", "long"],
      seed + 6,
    ),
    hairTexture: pick(
      ["fine natural", "soft wavy", "coily natural", "thick straight"],
      seed + 7,
    ),
    hairColor: pick(
      ["dark brown", "black", "chestnut", "warm brunette", "soft black with subtle highlights"],
      seed + 8,
    ),
    apparentHeight: pick(["160cm", "165cm", "168cm", "170cm", "173cm"], seed + 9),
    bodyType: pick(
      ["slim athletic", "soft hourglass", "average natural", "curvy natural", "lean petite"],
      seed + 10,
    ),
    bodyProportion: pick(
      ["balanced", "longer legs", "narrow shoulders", "soft midsection"],
      seed + 11,
    ),
    makeup: pick(
      ["minimal natural", "soft everyday makeup", "light mascara and lip balm", "barely-there glow"],
      seed + 12,
    ),
    nails: pick(
      ["short natural nude", "clean short unpainted", "soft pink short"],
      seed + 13,
    ),
    earrings: pick(
      ["small gold hoops", "tiny studs", "none", "thin silver hoops"],
      seed + 14,
    ),
    necklace: pick(["none", "thin delicate chain", "small pendant"], seed + 15),
    visualStyle: pick(
      ["authentic TikTok creator", "casual Brazilian influencer", "everyday UGC girl-next-door"],
      seed + 16,
    ),
  };
}

export function describeCharacter(profile: CharacterProfile, locked: boolean): string {
  const lockNote = locked
    ? "CHARACTER IDENTITY LOCKED: reuse the exact same face, hair, skin tone, apparent age, body structure, proportions and facial features across generations. Only clothing may change."
    : "Create a distinct adult woman consistent with the profile below.";

  return `${lockNote}
Adult woman, apparent age around ${profile.apparentAge}.
Skin tone: ${profile.skinTone}.
Face shape: ${profile.faceShape}. Eyes: ${profile.eyeShape}, ${profile.eyeColor}.
Hair: ${profile.hairLength} ${profile.hairTexture} ${profile.hairColor}, style ${profile.hairStyle}.
Body: apparent height ${profile.apparentHeight}, ${profile.bodyType}, ${profile.bodyProportion}.
Makeup: ${profile.makeup}. Nails: ${profile.nails}. Earrings: ${profile.earrings}. Necklace: ${profile.necklace}.
Visual style: ${profile.visualStyle}.
She must look like a real photographed person (smartphone UGC), not CGI, doll, mannequin, or 3D render.`;
}

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  apparentAge: "27",
  skinTone: "light-medium olive",
  faceShape: "oval",
  eyeColor: "dark brown",
  eyeShape: "almond",
  hairStyle: "loose waves",
  hairLength: "shoulder length",
  hairTexture: "soft wavy",
  hairColor: "dark brown",
  apparentHeight: "168cm",
  bodyType: "average natural",
  bodyProportion: "balanced",
  makeup: "minimal natural",
  nails: "short natural nude",
  earrings: "small gold hoops",
  necklace: "none",
  visualStyle: "authentic TikTok creator",
};

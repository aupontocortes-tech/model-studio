/**
 * Modelo alvo Neon/PostgreSQL (Drizzle).
 * Persistência atual do studio criativo: JSON em /data (studio-*.json).
 * Quando DATABASE_URL existir, migrar os repositórios para estas tabelas.
 */

export type StudioDbTables = {
  studio_characters: {
    id: string;
    project_id: string | null;
    display_name: string;
    age_label: string;
    face: string;
    hair: string;
    eyes: string;
    skin_tone: string;
    body_type: string;
    personality: string;
    locked_notes: string | null;
    primary_image_url: string | null;
    identity_prompt: string | null;
    body_details: string | null;
    body_prompt: string | null;
    face_image_url: string | null;
    body_image_url: string | null;
    outfit_ids: string;
    scene_ids: string;
    movements_json: string;
    voice_json: string | null;
    created_at: string;
    updated_at: string;
  };
  studio_outfits: {
    id: string;
    project_id: string | null;
    name: string;
    description: string;
    colors: string | null;
    image_url: string | null;
    worn_image_url: string | null;
    created_at: string;
    updated_at: string;
  };
  studio_scenes: {
    id: string;
    project_id: string | null;
    name: string;
    description: string;
    lighting: string | null;
    image_url: string | null;
    in_scene_image_url: string | null;
    created_at: string;
    updated_at: string;
  };
  studio_movements: {
    id: string;
    project_id: string | null;
    name: string;
    description: string;
    camera_hint: string | null;
    created_at: string;
    updated_at: string;
  };
  studio_scripts: {
    id: string;
    project_id: string | null;
    name: string;
    hook: string;
    body: string;
    cta: string | null;
    created_at: string;
    updated_at: string;
  };
  studio_saved_prompts: {
    id: string;
    project_id: string | null;
    character_id: string;
    outfit_id: string | null;
    scene_id: string;
    movement_id: string | null;
    script_id: string | null;
    title: string;
    system_prompt: string;
    user_prompt: string;
    full_prompt: string;
    created_at: string;
  };
};

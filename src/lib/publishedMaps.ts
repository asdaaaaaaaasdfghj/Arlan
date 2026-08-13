import { loadCustomMapData } from './customMapStorage';
import { saveCustomMap } from './customMap';
import { defaultCustomWeapons, defaultMapSize, defaultMapTheme, type CustomMapSize, type CustomMapTheme, type CustomWeaponSettings, type EditorCell, type SavedCustomMap } from './customMapTypes';
import { supabase } from './supabase';

export type PublishedMap = {
  id: string;
  title: string;
  map_data: SavedCustomMap;
  created_at: string;
};

export async function publishActiveCustomMap(title: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throwSupabaseError(userError);
  if (!userData.user) throw new Error('Sign in before publishing maps.');

  const map = loadCustomMapData();
  const { error } = await supabase.from('published_maps').insert({
    user_id: userData.user.id,
    title: title.trim() || 'Untitled arena',
    map_data: toSavedMap(map),
  });

  if (error) throwSupabaseError(error);
}

export async function loadPublishedMaps(): Promise<PublishedMap[]> {
  const { data, error } = await supabase
    .from('published_maps')
    .select('id,title,map_data,created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throwSupabaseError(error);
  return (data ?? []) as PublishedMap[];
}

export function installPublishedMap(map: PublishedMap): void {
  saveCustomMap(
    (map.map_data.cells ?? []) as EditorCell[],
    normalizeSize(map.map_data.size),
    normalizeTheme(map.map_data.theme),
    normalizeWeapons(map.map_data.weapons),
  );
}

function toSavedMap(map: {
  cells: EditorCell[];
  size: CustomMapSize;
  theme: CustomMapTheme;
  weapons: CustomWeaponSettings;
}): SavedCustomMap {
  return {
    cells: map.cells,
    size: map.size,
    theme: map.theme,
    weapons: map.weapons,
  };
}

function normalizeSize(size: SavedCustomMap['size']): CustomMapSize {
  return {
    cols: Number.isFinite(size?.cols) ? Number(size?.cols) : defaultMapSize.cols,
    rows: Number.isFinite(size?.rows) ? Number(size?.rows) : defaultMapSize.rows,
  };
}

function normalizeTheme(theme: SavedCustomMap['theme']): CustomMapTheme {
  return theme ?? defaultMapTheme;
}

function normalizeWeapons(weapons: SavedCustomMap['weapons']): CustomWeaponSettings {
  return {
    blaster: { ...defaultCustomWeapons.blaster, ...weapons?.blaster },
    railgun: { ...defaultCustomWeapons.railgun, ...weapons?.railgun },
    shotgun: { ...defaultCustomWeapons.shotgun, ...weapons?.shotgun },
    custom4: { ...defaultCustomWeapons.custom4, ...weapons?.custom4 },
    custom5: { ...defaultCustomWeapons.custom5, ...weapons?.custom5 },
  };
}

function throwSupabaseError(error: { message?: string; code?: string; details?: string }): never {
  const message = error.message ?? 'Supabase request failed.';
  const hint = message.includes('published_maps') || error.code === 'PGRST205'
    ? ' Run database migrations: npm run db:push -- --yes'
    : '';
  throw new Error(`${message}${hint}`);
}

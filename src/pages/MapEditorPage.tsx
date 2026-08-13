import type { User } from '@supabase/supabase-js';
import { type CSSProperties, useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  blockToolGroups,
  defaultMapSize,
  isSpawnCell,
  loadActiveCustomSlotId,
  loadCustomCells,
  loadCustomSize,
  loadCustomSlots,
  loadCustomTheme,
  loadCustomWeapons,
  maxMapCells,
  minMapCells,
  saveCustomMap,
  setActiveCustomSlot,
  type CustomMapSize,
  type CustomBlockKind,
  type CustomMapTheme,
  type CustomWeaponSettings,
  type CustomWeaponStats,
  type EditableWeaponId,
  type EditorCell,
} from '../lib/customMap';
import { loadGameSettings } from '../lib/gameSettings';
import { t } from '../lib/i18n';
import { publishActiveCustomMap } from '../lib/publishedMaps';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import './map-editor.css';

export function MapEditorPage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [user, setUser] = useState<User | null>(null);
  const [tool, setTool] = useState<CustomBlockKind>('wall');
  const [magnetForce, setMagnetForce] = useState(26);
  const [magnetRadius, setMagnetRadius] = useState(18);
  const [magnetBullets, setMagnetBullets] = useState(false);
  const [magnetGrenades, setMagnetGrenades] = useState(true);
  const [laserSides, setLaserSides] = useState(1);
  const [laserColor, setLaserColor] = useState<NonNullable<EditorCell['laserColor']>>('red');
  const [laserPerSide, setLaserPerSide] = useState(1);
  const [codeAction, setCodeAction] = useState<NonNullable<EditorCell['codeAction']>>('damage');
  const [codeTeam, setCodeTeam] = useState<NonNullable<EditorCell['codeTeam']>>('all');
  const [codePower, setCodePower] = useState(24);
  const [decorColor, setDecorColor] = useState<NonNullable<EditorCell['decorColor']>>('green');
  const [brushSize, setBrushSize] = useState(1);
  const [size, setSize] = useState(loadCustomSize);
  const [cells, setCells] = useState(loadCustomCells);
  const [theme, setTheme] = useState(loadCustomTheme);
  const [weapons, setWeapons] = useState<CustomWeaponSettings>(loadCustomWeapons);
  const [editedWeapon, setEditedWeapon] = useState<EditableWeaponId>('blaster');
  const [activeSlotId, setActiveSlotId] = useState(loadActiveCustomSlotId);
  const [slots, setSlots] = useState(loadCustomSlots);
  const [publishMessage, setPublishMessage] = useState('');
  const cellMap = new Map(cells.map((cell) => [getCellKey(cell), cell]));
  const magnetTool = tool === 'magnetPull' || tool === 'magnetPush';
  const laserTool = tool === 'laser';
  const codeTool = tool === 'codeBlock';
  const decorTool = tool.startsWith('decor');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <main className="map-editor-page">
        <nav className="menu-nav">
          <Link href="/">{t(language, 'home')}</Link>
          <Link href="/online">{language === 'ru' ? 'Онлайн' : 'Online'}</Link>
          <Link href="/profile">{language === 'ru' ? 'Профиль' : 'Profile'}</Link>
        </nav>
        <section className="editor-locked-panel">
          <p className="eyebrow">{language === 'ru' ? 'Гостевой режим' : 'Guest mode'}</p>
          <h1>{language === 'ru' ? 'Редактор карт закрыт' : 'Map editor is locked'}</h1>
          <p>{language === 'ru' ? 'Войди или зарегистрируйся в профиле, чтобы создавать custom-карты.' : 'Sign in or register in Profile to create custom maps.'}</p>
          <Link className="primary-action" href="/profile">{language === 'ru' ? 'Открыть профиль' : 'Open profile'}</Link>
        </section>
      </main>
    );
  }

  function paintCells(cell: Pick<EditorCell, 'col' | 'row'>) {
    const brushCells = getBrushCells(cell, brushSize, size).filter((item) => !isSpawnCell(item, size) || tool === 'flag');
    const clickedKey = getCellKey(cell);

    if (brushCells.length === 0) {
      return;
    }

    const nextCells = brushCells.map((brushCell) => createEditorCell(brushCell, tool, {
          magnetForce,
          magnetRadius,
          magnetBullets,
          magnetGrenades,
          laserSides,
          laserColor,
          laserPerSide,
          codeAction,
          codeTeam,
          codePower,
          decorColor,
        }));

    setCells((current) => {
      const clickedCell = current.find((item) => getCellKey(item) === clickedKey);
      const sameKind = clickedCell?.kind === tool;
      const sameSettings = sameKind && haveSameToolSettings(clickedCell, nextCells.find((item) => getCellKey(item) === clickedKey) ?? nextCells[0]);
      if (sameSettings) {
        return current.filter((item) => !brushCells.some((brushCell) => getCellKey(brushCell) === getCellKey(item)));
      }

      return [
        ...current.filter((item) => !brushCells.some((brushCell) => getCellKey(brushCell) === getCellKey(item))),
        ...nextCells,
      ];
    });
  }

  function saveMap() {
    saveCustomMap(cells.filter((cell) => !isSpawnCell(cell, size)), size, theme, weapons);
    setSlots(loadCustomSlots());
  }

  function clearMap() {
    setCells([]);
    saveCustomMap([], size, theme, weapons);
    setSlots(loadCustomSlots());
  }

  function selectSlot(id: string) {
    const slot = slots.find((item) => item.id === id);
    if (!slot) {
      return;
    }

    setActiveCustomSlot(id);
    setActiveSlotId(id);
    setSize(slot.size);
    setCells(slot.cells);
    setTheme(slot.theme);
    setWeapons(slot.weapons);
  }

  function resizeMap(nextSize: CustomMapSize) {
    const clamped = clampSize(nextSize);
    setSize(clamped);
    setCells((current) => current.filter((cell) => cell.col < clamped.cols && cell.row < clamped.rows));
  }

  function resetSize() {
    resizeMap(defaultMapSize);
  }

  function updateWeapon(stat: WeaponNumberStat, value: number) {
    setWeapons((current) => ({
      ...current,
      [editedWeapon]: {
        ...current[editedWeapon],
        [stat]: stat === 'bullets' ? Math.round(value) : value,
      },
    }));
  }

  function updateWeaponName(name: string) {
    setWeapons((current) => ({
      ...current,
      [editedWeapon]: {
        ...current[editedWeapon],
        name: name.slice(0, 18),
      },
    }));
  }

  async function publishMap() {
    setPublishMessage('');
    saveMap();
    try {
      await publishActiveCustomMap(slots.find((slot) => slot.id === activeSlotId)?.name ?? 'Custom arena');
      setPublishMessage(language === 'ru' ? 'Карта выложена на сервер.' : 'Map published to server.');
    } catch (error) {
      setPublishMessage(getPublishErrorMessage(error, language));
    }
  }

  return (
    <main className="map-editor-page">
      <nav className="menu-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <Link href="/game?map=custom">{t(language, 'playCustom')}</Link>
      </nav>
      <section className="editor-layout">
        <div className="editor-copy">
          <p className="eyebrow">{t(language, 'mapBuilder')}</p>
          <h1>{t(language, 'mapEditor')}</h1>
          <p>{t(language, 'editorCopy')}</p>
          <section className="map-slots">
            <strong>{language === 'ru' ? 'Сохранения карт' : 'Map saves'}</strong>
            <div>
              {slots.map((slot) => (
                <button
                  type="button"
                  className={slot.id === activeSlotId ? 'selected-slot' : ''}
                  key={slot.id}
                  onClick={() => selectSlot(slot.id)}
                >
                  {slot.name}
                  <span>{slot.cells.length}</span>
                </button>
              ))}
            </div>
          </section>
          <label className="theme-control">
            <span>{language === 'ru' ? 'Фон карты' : 'Map background'}</span>
            <select value={theme} onChange={(event) => setTheme(event.target.value as CustomMapTheme)}>
              {mapThemes.map((item) => (
                <option value={item.id} key={item.id}>{language === 'ru' ? item.ru : item.en}</option>
              ))}
            </select>
          </label>
          <details className="weapon-editor">
            <summary>{language === 'ru' ? 'Редактор оружия' : 'Weapon editor'}</summary>
            <strong>{language === 'ru' ? 'Редактор оружия' : 'Weapon editor'}</strong>
            <select value={editedWeapon} onChange={(event) => setEditedWeapon(event.target.value as EditableWeaponId)}>
              {editableWeapons.map((weapon) => <option value={weapon.id} key={weapon.id}>{weapon.label}</option>)}
            </select>
            <label className="weapon-name-control">
              <span>{language === 'ru' ? 'Название' : 'Name'}</span>
              <input value={weapons[editedWeapon].name} maxLength={18} onChange={(event) => updateWeaponName(event.target.value)} />
            </label>
            <div className="weapon-editor-grid">
              <NumberControl label={language === 'ru' ? 'Урон' : 'Damage'} value={weapons[editedWeapon].damage} min={1} max={120} onChange={(value) => updateWeapon('damage', value)} />
              <NumberControl label={language === 'ru' ? 'Задержка' : 'Cooldown'} value={weapons[editedWeapon].cooldown} min={0} max={3} step={0.05} onChange={(value) => updateWeapon('cooldown', value)} />
              <NumberControl label={language === 'ru' ? 'Скорость' : 'Speed'} value={weapons[editedWeapon].speed} min={20} max={180} onChange={(value) => updateWeapon('speed', value)} />
              <NumberControl label={language === 'ru' ? 'Пули' : 'Bullets'} value={weapons[editedWeapon].bullets} min={1} max={12} onChange={(value) => updateWeapon('bullets', value)} />
              <NumberControl label={language === 'ru' ? 'Разброс' : 'Spread'} value={weapons[editedWeapon].spread} min={0} max={1.2} step={0.05} onChange={(value) => updateWeapon('spread', value)} />
              <NumberControl label={language === 'ru' ? 'Размер' : 'Size'} value={weapons[editedWeapon].size} min={4} max={24} onChange={(value) => updateWeapon('size', value)} />
            </div>
            <span>{language === 'ru' ? 'Работает только на своей карте.' : 'Only works on Custom Map.'}</span>
          </details>
          <div className="editor-size-controls">
            <label>
              <span>{t(language, 'mapWidth')}</span>
              <input
                type="number"
                min={minMapCells}
                max={maxMapCells}
                value={size.cols}
                onChange={(event) => resizeMap({ ...size, cols: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>{t(language, 'mapHeight')}</span>
              <input
                type="number"
                min={minMapCells}
                max={maxMapCells}
                value={size.rows}
                onChange={(event) => resizeMap({ ...size, rows: Number(event.target.value) })}
              />
            </label>
            <button type="button" className="ghost-button" onClick={resetSize}>{t(language, 'defaultSize')}</button>
          </div>
          <label className="brush-control">
            <span>{language === 'ru' ? 'Размер кисти' : 'Brush size'}: {brushSize}</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(event) => setBrushSize(clamp(Number(event.target.value), 1, 20))}
            />
          </label>
          <div className="editor-tools">
            {blockToolGroups.map((group, index) => (
              <details className="editor-tool-group" key={group.category} open={index === 0}>
                <summary>{t(language, group.labelKey)}</summary>
                <div className="editor-tool-grid">
                  {group.tools.map((item) => (
                    <button
                      type="button"
                      className={tool === item.kind ? 'selected-tool' : ''}
                      key={item.kind}
                      onClick={() => setTool(item.kind)}
                    >
                      <span className={`tool-icon ${item.kind}-cell`} aria-hidden="true" />
                      {t(language, item.kind)}
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {magnetTool && (
            <section className="magnet-settings">
              <label>
                <span>{language === 'ru' ? 'Сила' : 'Force'}: {magnetForce}</span>
                <input type="range" min="4" max="50" value={magnetForce} onChange={(event) => setMagnetForce(Number(event.target.value))} />
              </label>
              <label>
                <span>{language === 'ru' ? 'Радиус' : 'Radius'}: {magnetRadius}</span>
                <input type="range" min="6" max="40" value={magnetRadius} onChange={(event) => setMagnetRadius(Number(event.target.value))} />
              </label>
              <label className="magnet-toggle">
                <input type="checkbox" checked={magnetBullets} onChange={(event) => setMagnetBullets(event.target.checked)} />
                <span>{language === 'ru' ? 'Работает на пулях' : 'Affects bullets'}</span>
              </label>
              <label className="magnet-toggle">
                <input type="checkbox" checked={magnetGrenades} onChange={(event) => setMagnetGrenades(event.target.checked)} />
                <span>{language === 'ru' ? 'Работает на гранатах' : 'Affects grenades'}</span>
              </label>
            </section>
          )}
          {laserTool && (
            <section className="magnet-settings">
              <label>
                <span>{language === 'ru' ? 'Сторон с лазерами' : 'Laser sides'}: {laserSides}</span>
                <input type="range" min="1" max="4" value={laserSides} onChange={(event) => setLaserSides(Number(event.target.value))} />
              </label>
              <label>
                <span>{language === 'ru' ? 'Лазеров на 1 стороне' : 'Lasers per side'}: {laserPerSide}</span>
                <input type="range" min="1" max="4" value={laserPerSide} onChange={(event) => setLaserPerSide(Number(event.target.value))} />
              </label>
              <label>
                <span>{language === 'ru' ? 'Цвет' : 'Color'}</span>
                <select value={laserColor} onChange={(event) => setLaserColor(event.target.value as NonNullable<EditorCell['laserColor']>)}>
                  <option value="red">{language === 'ru' ? 'Красный' : 'Red'}</option>
                  <option value="blue">{language === 'ru' ? 'Синий' : 'Blue'}</option>
                  <option value="green">{language === 'ru' ? 'Зелёный' : 'Green'}</option>
                  <option value="purple">{language === 'ru' ? 'Фиолетовый' : 'Purple'}</option>
                </select>
              </label>
            </section>
          )}
          {codeTool && (
            <section className="magnet-settings">
              <label>
                <span>{language === 'ru' ? 'Команда кода' : 'Code action'}</span>
                <select value={codeAction} onChange={(event) => setCodeAction(event.target.value as NonNullable<EditorCell['codeAction']>)}>
                  <option value="damage">{language === 'ru' ? 'Нанести урон' : 'Damage'}</option>
                  <option value="heal">{language === 'ru' ? 'Лечить' : 'Heal'}</option>
                  <option value="speed">{language === 'ru' ? 'Ускорить' : 'Speed boost'}</option>
                  <option value="shock">{language === 'ru' ? 'Электрошок' : 'Shock'}</option>
                  <option value="build">{language === 'ru' ? 'Строить блок' : 'Build block'}</option>
                  <option value="spawnZombie">{language === 'ru' ? 'Спавн зомби' : 'Spawn zombie'}</option>
                  <option value="particles">{language === 'ru' ? 'Частицы' : 'Particles'}</option>
                </select>
              </label>
              <label>
                <span>{language === 'ru' ? 'Кого трогает' : 'Affects'}</span>
                <select value={codeTeam} onChange={(event) => setCodeTeam(event.target.value as NonNullable<EditorCell['codeTeam']>)}>
                  <option value="all">{language === 'ru' ? 'Всех' : 'Everyone'}</option>
                  <option value="blue">{language === 'ru' ? 'Синих' : 'Blue'}</option>
                  <option value="red">{language === 'ru' ? 'Красных' : 'Red'}</option>
                </select>
              </label>
              <label>
                <span>{language === 'ru' ? 'Сила' : 'Power'}: {codePower}</span>
                <input type="range" min="1" max="80" value={codePower} onChange={(event) => setCodePower(Number(event.target.value))} />
              </label>
            </section>
          )}
          {decorTool && (
            <section className="magnet-settings">
              <label>
                <span>{language === 'ru' ? 'Цвет декора' : 'Decoration color'}</span>
                <select value={decorColor} onChange={(event) => setDecorColor(event.target.value as NonNullable<EditorCell['decorColor']>)}>
                  {decorColors.map((item) => (
                    <option value={item.id} key={item.id}>{language === 'ru' ? item.ru : item.en}</option>
                  ))}
                </select>
              </label>
            </section>
          )}
          <div className="editor-actions">
            <button type="button" onClick={saveMap}>{t(language, 'save')}</button>
            <button type="button" className="ghost-button" disabled={!isSupabaseConfigured} onClick={publishMap}>{language === 'ru' ? 'Выложить карту' : 'Publish map'}</button>
            <button type="button" className="ghost-button" onClick={clearMap}>{t(language, 'clear')}</button>
          </div>
          {publishMessage && <p className="editor-message">{publishMessage}</p>}
        </div>
        <div className={`editor-board editor-theme-${theme}`} style={{ gridTemplateColumns: `repeat(${size.cols}, 1fr)` }}>
          {Array.from({ length: size.cols * size.rows }, (_, index) => {
            const cell = { col: index % size.cols, row: Math.floor(index / size.cols) };
            const existingCell = cellMap.get(getCellKey(cell));
            const kind = existingCell?.kind;
            const spawn = isSpawnCell(cell, size);

            return (
              <button
                type="button"
                className={`${kind ? `${kind}-cell` : ''} ${spawn && !kind ? 'spawn-cell' : ''}`}
                style={getEditorCellStyle(existingCell)}
                key={getCellKey(cell)}
                onPointerDown={() => paintCells(cell)}
                onPointerEnter={(event) => {
                  if (event.buttons === 1) paintCells(cell);
                }}
                aria-label={`Cell ${cell.col + 1}, ${cell.row + 1}`}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}

const mapThemes: Array<{ id: CustomMapTheme; en: string; ru: string }> = [
  { id: 'arena', en: 'Arena', ru: 'Арена' },
  { id: 'desert', en: 'Desert', ru: 'Пустыня' },
  { id: 'mountain', en: 'Mountain', ru: 'Горы' },
  { id: 'snow', en: 'Snow', ru: 'Снег' },
  { id: 'acidLab', en: 'Acid lab', ru: 'Кислотная лаба' },
  { id: 'volcanic', en: 'Volcanic', ru: 'Вулкан' },
  { id: 'night', en: 'Night', ru: 'Ночь' },
];

const editableWeapons: Array<{ id: EditableWeaponId; label: string }> = [
  { id: 'blaster', label: 'Blaster' },
  { id: 'railgun', label: 'Railgun' },
  { id: 'shotgun', label: 'Shotgun' },
  { id: 'custom4', label: 'Custom 4' },
  { id: 'custom5', label: 'Custom 5' },
];

const decorColors: Array<{ id: NonNullable<EditorCell['decorColor']>; en: string; ru: string }> = [
  { id: 'green', en: 'Green', ru: 'Зелёный' },
  { id: 'red', en: 'Red', ru: 'Красный' },
  { id: 'blue', en: 'Blue', ru: 'Синий' },
  { id: 'yellow', en: 'Yellow', ru: 'Жёлтый' },
  { id: 'purple', en: 'Purple', ru: 'Фиолетовый' },
  { id: 'gray', en: 'Gray', ru: 'Серый' },
];

type WeaponNumberStat = Exclude<keyof CustomWeaponStats, 'name'>;

function NumberControl({ label, value, min, max, step = 1, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
    </label>
  );
}

function createEditorCell(
  cell: Pick<EditorCell, 'col' | 'row'>,
  kind: CustomBlockKind,
  settings: Pick<EditorCell, 'magnetForce' | 'magnetRadius' | 'magnetBullets' | 'magnetGrenades' | 'laserSides' | 'laserColor' | 'laserPerSide' | 'codeAction' | 'codeTeam' | 'codePower' | 'decorColor'>,
): EditorCell {
  if (kind === 'magnetPull' || kind === 'magnetPush') {
    const { magnetForce, magnetRadius, magnetBullets, magnetGrenades } = settings;
    return { ...cell, kind, magnetForce, magnetRadius, magnetBullets, magnetGrenades };
  }

  if (kind === 'laser') {
    const { laserSides, laserColor, laserPerSide } = settings;
    return { ...cell, kind, laserSides, laserColor, laserPerSide };
  }

  if (kind === 'codeBlock') {
    const { codeAction, codeTeam, codePower } = settings;
    return { ...cell, kind, codeAction, codeTeam, codePower };
  }

  if (kind.startsWith('decor')) {
    return { ...cell, kind, decorColor: settings.decorColor };
  }

  return { ...cell, kind };
}

function haveSameToolSettings(first: EditorCell | undefined, second: EditorCell | undefined): boolean {
  if (!first || !second || first.kind !== second.kind) {
    return false;
  }

  if (first.kind === 'magnetPull' || first.kind === 'magnetPush') {
    return first.magnetForce === second.magnetForce
      && first.magnetRadius === second.magnetRadius
      && first.magnetBullets === second.magnetBullets
      && first.magnetGrenades === second.magnetGrenades;
  }

  if (first.kind === 'laser') {
    return first.laserSides === second.laserSides
      && first.laserColor === second.laserColor
      && first.laserPerSide === second.laserPerSide;
  }

  if (first.kind === 'codeBlock') {
    return first.codeAction === second.codeAction
      && first.codeTeam === second.codeTeam
      && first.codePower === second.codePower;
  }

  if (first.kind.startsWith('decor')) {
    return first.decorColor === second.decorColor;
  }

  return true;
}

function getEditorCellStyle(cell: EditorCell | undefined): CSSProperties | undefined {
  if (!cell?.decorColor) {
    return undefined;
  }

  return { '--decor-color': getDecorationColor(cell.decorColor) } as CSSProperties;
}

function getDecorationColor(color: NonNullable<EditorCell['decorColor']>): string {
  if (color === 'red') return '#ef476f';
  if (color === 'blue') return '#3a86ff';
  if (color === 'yellow') return '#ffd43b';
  if (color === 'purple') return '#845ef7';
  if (color === 'gray') return '#868e96';
  return '#2f9e44';
}

function getCellKey(cell: Pick<EditorCell, 'col' | 'row'>): string {
  return `${cell.col}:${cell.row}`;
}

function getBrushCells(center: Pick<EditorCell, 'col' | 'row'>, brushSize: number, size: CustomMapSize): Array<Pick<EditorCell, 'col' | 'row'>> {
  const clampedBrush = clamp(Math.round(brushSize), 1, 20);
  const startCol = center.col - Math.floor((clampedBrush - 1) / 2);
  const startRow = center.row - Math.floor((clampedBrush - 1) / 2);
  const cells: Array<Pick<EditorCell, 'col' | 'row'>> = [];

  for (let row = startRow; row < startRow + clampedBrush; row += 1) {
    for (let col = startCol; col < startCol + clampedBrush; col += 1) {
      if (col >= 0 && col < size.cols && row >= 0 && row < size.rows) {
        cells.push({ col, row });
      }
    }
  }

  return cells;
}

function clampSize(size: CustomMapSize): CustomMapSize {
  return {
    cols: clamp(Math.round(size.cols), minMapCells, maxMapCells),
    rows: clamp(Math.round(size.rows), minMapCells, maxMapCells),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function getPublishErrorMessage(error: unknown, language: 'ru' | 'en'): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return language === 'ru' ? 'Не получилось выложить карту. Проверь вход и базу Supabase.' : 'Publish failed. Check sign-in and Supabase database.';
}

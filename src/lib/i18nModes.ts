import type { GameMode, MapId } from './arenaTypes';
import type { Language } from './gameSettings';

const swordModeText: Record<Language, [string, string]> = {
  en: ['Sword Fights', 'No guns or grenades. Close in and slash with swords.'],
  ru: ['Бои на мечах', 'Без пушек и гранат: подойди ближе и бей мечом.'],
};

const modes: Omit<Record<GameMode, { en: [string, string]; ru: [string, string] }>, 'swordDuel'> = {
  duel: { en: ['Duel', 'Classic two-player fight to 5 points.'], ru: ['Дуэль', 'Классический бой двух игроков до 5 очков.'] },
  quickDraw: { en: ['Quick Draw', 'Fast round. Every hit is lethal, first to 3.'], ru: ['Быстрый выстрел', 'Короткий раунд: любое попадание смертельно, игра до 3.'] },
  blitz: { en: ['Blitz', 'Twenty-five seconds, first to 3. No warmup.'], ru: ['Блиц', '25 секунд, первый до 3. Без разогрева.'] },
  tankDuel: { en: ['Tank Duel', 'Big health bars and longer trades.'], ru: ['Танковая дуэль', 'Больше здоровья и дольше перестрелки.'] },
  railDuel: { en: ['Rail Duel', 'Railguns only. Slow shots, scary damage.'], ru: ['Рельсовая дуэль', 'Только рейлган: медленно, но больно.'] },
  flameDuel: { en: ['Flamethrower Fight', 'Only flamethrowers. Get close and melt the arena.'], ru: ['Бой огнемётами', 'Только огнемёты: подойди ближе и прожарь арену.'] },
  paintBattle: { en: ['Paint Battle', 'Leave paint trails while moving. Highest map coverage wins.'], ru: ['Битва краской', 'Бегай и оставляй краску. Побеждает тот, кто закрасил больше карты.'] },
  miniGames: { en: ['Mini Games', 'Ten mini-games, thirty seconds each. Adapt fast.'], ru: ['Mini Games', '10 мини-игр по 30 секунд. Правила постоянно меняются.'] },
  spleef: { en: ['Spleef', 'Shoot the floor under the enemy and make them fall.'], ru: ['Сплиф', 'Разрушай плиты под врагом и сбрасывай его вниз.'] },
  tileRun: { en: ['Run', 'Tiles break after you step on them. Keep moving.'], ru: ['Ран', 'Плиты ломаются после шага. Остановишься — упадёшь.'] },
  hideSeek: { en: ['Hide and Seek', 'Stand behind cover to fade out, ambush, and survive.'], ru: ['Прятки', 'Встань за укрытие: игрок потускнеет, ник пропадёт, можно делать засаду.'] },
  hungerGames: { en: ['Hunger Games', 'Scavenge power-ups and lucky blocks. Last fighter wins the trades.'], ru: ['Голодные игры', 'Собирай бонусы и лаки-блоки. Выживает тот, кто лучше лутается.'] },
  swapRift: { en: ['Swap Rift', 'Step into a rift to swap places with the enemy.'], ru: ['Разлом обмена', 'Зайди в разлом, чтобы мгновенно поменяться местами с врагом.'] },
  grenadeMayhem: { en: ['Grenade Mayhem', 'Fast grenades, loud explosions, first to 5.'], ru: ['Гранатный хаос', 'Быстрые гранаты, громкие взрывы, игра до 5.'] },
  endlessDuel: { en: ['Endless Duel', 'No timer. Fight until someone reaches 7 points.'], ru: ['Бесконечная дуэль', 'Без таймера: бой до 7 очков.'] },
  kingHill: { en: ['King of the Hill', 'Hold the center zone alone to score. First to 20.'], ru: ['Царь горы', 'Удерживай центр в одиночку, чтобы получать очки. Первый до 20.'] },
  captureFlag: { en: ['Capture the Flag', 'Steal the enemy flag and bring it home. First to 3 captures.'], ru: ['Захват флага', 'Укради флаг врага и принеси домой. Первый до 3 захватов.'] },
  glassWars: { en: ['Glass Wars', 'Break the enemy glass core, then eliminate them for good. Build with blocks, not barricades.'], ru: ['Стеклянные войны', 'Разбей стеклянное ядро врага, потом добей его окончательно. Строй блоками, не баррикадами.'] },
  luckyBlocks: { en: ['Lucky Blocks', 'Break lucky blocks for wild buffs and curses. First to 5.'], ru: ['Лаки блоки', 'Ломай лаки блоки ради бафов и проклятий. Первый до 5.'] },
  zombies: { en: ['Zombie Rush', 'Build barricades and hold for 60 seconds.'], ru: ['Зомби-рывок', 'Строй баррикады и держись 60 секунд.'] },
  swarmNight: { en: ['Swarm Night', 'Lots of weak zombies rush the arena.'], ru: ['Ночь толпы', 'Много слабых зомби бегут на арену.'] },
  nightmare: { en: ['Nightmare', 'Tough zombies hit harder and survive longer.'], ru: ['Кошмар', 'Зомби крепче, больнее бьют и дольше живут.'] },
  fortress: { en: ['Fortress', 'More time to build, but the siege lasts longer.'], ru: ['Крепость', 'Больше времени на строительство, но осада длиннее.'] },
  disasters: { en: ['Disaster Survival', 'Survive fires, storms, quakes, and floods for 70 seconds.'], ru: ['Выживание в катастрофах', 'Переживи огонь, бурю, землетрясение и волну 70 секунд.'] },
};

const mapRu: Record<MapId, string> = {
  crossfire: 'Перекрёстный огонь',
  lanes: 'Линии',
  bunker: 'Бункер',
  open: 'Открытое поле',
  custom: 'Своя карта',
};

export function modeName(mode: GameMode, language: Language): string {
  if (mode === 'swordDuel') return swordModeText[language][0];
  return modes[mode][language][0];
}

export function modeDescription(mode: GameMode, language: Language): string {
  if (mode === 'swordDuel') return swordModeText[language][1];
  return modes[mode][language][1];
}

export function mapName(mapId: MapId, englishName: string, language: Language): string {
  return language === 'ru' ? mapRu[mapId] : englishName;
}

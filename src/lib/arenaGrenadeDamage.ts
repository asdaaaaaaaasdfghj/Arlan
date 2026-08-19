import {
  type Barricade,
  type GameMode,
  type Grenade,
  type MapId,
  type Player,
  type PlayerId,
  type Zombie,
} from './arenaTypes';
import { isCoopSurvivalMode, isGlassWarsMode } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';

export function damagePlayers(
  players: Record<PlayerId, Player>,
  grenade: Grenade,
  mode: GameMode,
  mapId: MapId,
  damage: number,
  radius: number,
  canRespawn: Record<PlayerId, boolean> = { blue: true, red: true },
) {
  const nextPlayers = { ...players };
  (Object.keys(players) as PlayerId[]).forEach((id) => {
    if (isCoopSurvivalMode(mode) && id !== grenade.owner) {
      return;
    }

    const player = nextPlayers[id];
    if (player.hp <= 0 || distance(player.x, player.y, grenade) > radius) {
      return;
    }

    const hp = player.hp - damage;
    nextPlayers[id] = hp <= 0 && !isCoopSurvivalMode(mode) && canRespawn[id]
      ? respawnPlayer(player, mapId)
      : { ...player, hp: Math.max(0, hp) };
    if (id === grenade.owner && hp <= 0) {
      nextPlayers[id] = { ...nextPlayers[id], selfGrenadeDeaths: player.selfGrenadeDeaths + 1 };
    }
    nextPlayers[grenade.owner] = {
      ...nextPlayers[grenade.owner],
      score: hp <= 0 && id !== grenade.owner && !isCoopSurvivalMode(mode) && shouldScorePlayerKill(mode, id, canRespawn) ? nextPlayers[grenade.owner].score + 1 : nextPlayers[grenade.owner].score,
    };
  });

  return nextPlayers;
}

function shouldScorePlayerKill(mode: GameMode, targetId: PlayerId, canRespawn: Record<PlayerId, boolean>): boolean {
  return !isGlassWarsMode(mode) || !canRespawn[targetId];
}

export function damageZombies(
  zombies: Zombie[],
  players: Record<PlayerId, Player>,
  grenade: Grenade,
  damage: number,
  radius: number,
) {
  const nextPlayers = { ...players };
  const nextZombies = zombies.filter((zombie) => {
    if (distance(zombie.x, zombie.y, grenade) > radius) {
      return true;
    }

    const alive = zombie.hp - damage > 0;
    nextPlayers[grenade.owner] = { ...nextPlayers[grenade.owner], score: nextPlayers[grenade.owner].score + (alive ? 0 : 1) };
    return alive;
  });

  return { players: nextPlayers, zombies: nextZombies };
}

export function damageBarricades(barricades: Barricade[], grenade: Grenade, damage: number, radius: number) {
  return barricades
    .map((item) => (rectDistance(item, grenade) > radius ? item : { ...item, hp: item.hp - damage }))
    .filter((item) => item.hp > 0);
}

function distance(x: number, y: number, grenade: Grenade): number {
  return Math.hypot(x - grenade.x, y - grenade.y);
}

function rectDistance(rect: Barricade, grenade: Grenade): number {
  const x = clamp(grenade.x, rect.x, rect.x + rect.width);
  const y = clamp(grenade.y, rect.y, rect.y + rect.height);
  return distance(x, y, grenade);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

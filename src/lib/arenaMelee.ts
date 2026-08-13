import type { GameInput, HitEffect, MapId, Player, PlayerId } from './arenaTypes';
import { respawnPlayer } from './arenaPlayers';

const swordCooldown = 0.46;
const swordRange = 20;
const swordDamage = 28;
const swordArcDot = 0.25;

export function applySwordAttacks(
  players: Record<PlayerId, Player>,
  input: GameInput,
  mapId: MapId,
  nextEffectId: number,
): { players: Record<PlayerId, Player>; effects: HitEffect[] } {
  const nextPlayers = { ...players };
  const effects: HitEffect[] = [];

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const attacker = nextPlayers[id];
    if (attacker.hp <= 0 || attacker.cooldown > 0 || attacker.shockTimer > 0 || !input[id].shoot) {
      return;
    }

    const targetId: PlayerId = id === 'blue' ? 'red' : 'blue';
    const target = nextPlayers[targetId];
    const hit = target.hp > 0 && isSwordHit(attacker, target);
    const hp = hit ? target.hp - swordDamage : target.hp;

    nextPlayers[id] = {
      ...attacker,
      cooldown: swordCooldown,
      shotsFired: attacker.shotsFired + 1,
      score: hit && hp <= 0 ? attacker.score + 1 : attacker.score,
    };

    if (!hit) {
      return;
    }

    effects.push({ id: nextEffectId + effects.length, x: target.x, y: target.y, kind: 'player', age: 0.28 });
    nextPlayers[targetId] = hp <= 0 ? respawnPlayer(target, mapId) : { ...target, hp: Math.max(0, hp) };
  });

  return { players: nextPlayers, effects };
}

function isSwordHit(attacker: Player, target: Player): boolean {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const distance = Math.hypot(dx, dy);
  if (distance > swordRange) return false;

  const facingLength = Math.hypot(attacker.facingX, attacker.facingY) || 1;
  const directionLength = distance || 1;
  const dot = (attacker.facingX / facingLength) * (dx / directionLength)
    + (attacker.facingY / facingLength) * (dy / directionLength);
  return dot >= swordArcDot;
}

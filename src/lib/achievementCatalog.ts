export type AchievementId = 'firstScore' | 'duelWin' | 'survivor' | 'builder' | 'grenadier' | 'zombieHunter'
  | 'silentSurvivor' | 'selfDestruct' | 'easyBotOops' | 'modeMaster' | 'mapTour';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
};

export const achievements: Achievement[] = [
  { id: 'firstScore', title: 'First Blood', description: 'Score your first point.' },
  { id: 'duelWin', title: 'Arena Winner', description: 'Win any PvP round.' },
  { id: 'survivor', title: 'Still Standing', description: 'Survive a zombie mode.' },
  { id: 'builder', title: 'Little Architect', description: 'Place 3 barricades in one round.' },
  { id: 'grenadier', title: 'Boom Friend', description: 'Score in Grenade Mayhem.' },
  { id: 'zombieHunter', title: 'Cleanup Crew', description: 'Defeat 10 zombies in one round.' },
  { id: 'silentSurvivor', title: 'Silent Legend', description: 'Survive a round without firing a shot.' },
  { id: 'selfDestruct', title: 'Self Destruct', description: 'Die from your own grenade.' },
  { id: 'easyBotOops', title: 'How Did This Happen?', description: 'Lose to the bot on Easy.' },
  { id: 'modeMaster', title: 'All-Round Champion', description: 'Win in every game mode.' },
  { id: 'mapTour', title: 'Tourist With A Gun', description: 'Play every built-in map.' },
];

export const achievementRu: Record<AchievementId, [string, string]> = {
  firstScore: ['Первая кровь', 'Набери первое очко.'],
  duelWin: ['Победитель арены', 'Победи в любом PvP-раунде.'],
  survivor: ['Всё ещё жив', 'Выживи в зомби-режиме.'],
  builder: ['Маленький архитектор', 'Поставь 3 баррикады за раунд.'],
  grenadier: ['Бум-друг', 'Набери очко в Grenade Mayhem.'],
  zombieHunter: ['Команда зачистки', 'Победи 10 зомби за раунд.'],
  silentSurvivor: ['Тихая легенда', 'Выживи раунд без единого выстрела.'],
  selfDestruct: ['Самоуничтожение', 'Умри от своей же гранаты.'],
  easyBotOops: ['Как так вышло?', 'Проиграй боту на Easy.'],
  modeMaster: ['Чемпион всех режимов', 'Победи во всех режимах игры.'],
  mapTour: ['Турист с пушкой', 'Сыграй на всех обычных картах.'],
};

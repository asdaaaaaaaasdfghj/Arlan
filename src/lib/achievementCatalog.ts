export type AchievementId = 'firstScore' | 'duelWin' | 'survivor' | 'builder' | 'grenadier' | 'zombieHunter'
  | 'silentSurvivor' | 'selfDestruct' | 'easyBotOops' | 'painSpeedrun' | 'disappointment3' | 'qSpam' | 'adminServer' | 'updateConfusion' | 'modeMaster' | 'mapTour';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
};

export const achievementTranslations: Partial<Record<string, Partial<Record<AchievementId, [string, string]>>>> = {
  es: {
    firstScore: ['Primera sangre', 'Consigue tu primer punto.'],
    duelWin: ['Ganador de arena', 'Gana cualquier ronda PvP.'],
    survivor: ['Sigue en pie', 'Sobrevive a un modo zombi.'],
    builder: ['Pequeño arquitecto', 'Coloca 3 barricadas en una ronda.'],
    grenadier: ['Amigo boom', 'Consigue un punto en Grenade Mayhem.'],
    zombieHunter: ['Equipo de limpieza', 'Derrota 10 zombis en una ronda.'],
    silentSurvivor: ['Leyenda silenciosa', 'Sobrevive una ronda sin disparar.'],
    selfDestruct: ['Autodestrucción', 'Muere por tu propia granada.'],
    easyBotOops: ['¿Cómo pasó esto?', 'Pierde contra el bot en Easy.'],
    painSpeedrun: ['Speedrun del dolor', 'Consigue un punto contra el bot termonuclear.'],
    disappointment3: ['Decepción III', 'Intenta entrar al servidor oficial como invitado.'],
    modeMaster: ['Campeón total', 'Gana en todos los modos de juego.'],
    mapTour: ['Turista armado', 'Juega en todos los mapas normales.'],
  },
  de: {
    firstScore: ['Erstes Blut', 'Erziele deinen ersten Punkt.'],
    duelWin: ['Arena-Sieger', 'Gewinne eine PvP-Runde.'],
    survivor: ['Immer noch da', 'Überlebe einen Zombie-Modus.'],
    builder: ['Kleiner Architekt', 'Platziere 3 Barrikaden in einer Runde.'],
    grenadier: ['Boom-Freund', 'Erziele einen Punkt in Grenade Mayhem.'],
    zombieHunter: ['Aufräumtrupp', 'Besiege 10 Zombies in einer Runde.'],
    silentSurvivor: ['Stille Legende', 'Überlebe eine Runde ohne Schuss.'],
    selfDestruct: ['Selbstzerstörung', 'Stirb durch deine eigene Granate.'],
    easyBotOops: ['Wie ist das passiert?', 'Verliere gegen den Bot auf Easy.'],
    painSpeedrun: ['Schmerz-Speedrun', 'Erziele einen Punkt gegen den thermonuklearen Bot.'],
    disappointment3: ['Enttäuschung III', 'Versuche als Gast dem offiziellen Server beizutreten.'],
    modeMaster: ['Allround-Champion', 'Gewinne in jedem Spielmodus.'],
    mapTour: ['Tourist mit Waffe', 'Spiele jede normale Karte.'],
  },
  fr: {
    firstScore: ['Premier sang', 'Marque ton premier point.'],
    duelWin: ['Vainqueur de l’arène', 'Gagne une manche PvP.'],
    survivor: ['Toujours debout', 'Survis à un mode zombie.'],
    builder: ['Petit architecte', 'Place 3 barricades en une manche.'],
    grenadier: ['Ami boom', 'Marque un point en Grenade Mayhem.'],
    zombieHunter: ['Équipe nettoyage', 'Bats 10 zombies en une manche.'],
    silentSurvivor: ['Légende silencieuse', 'Survis sans tirer une seule fois.'],
    selfDestruct: ['Autodestruction', 'Meurs avec ta propre grenade.'],
    easyBotOops: ['Comment c’est arrivé ?', 'Perds contre le bot en Easy.'],
    painSpeedrun: ['Speedrun de douleur', 'Marque un point contre le bot thermonucléaire.'],
    disappointment3: ['Déception III', 'Essaie de rejoindre le serveur officiel en invité.'],
    modeMaster: ['Champion complet', 'Gagne dans tous les modes.'],
    mapTour: ['Touriste armé', 'Joue toutes les cartes normales.'],
  },
  kk: {
    firstScore: ['Алғашқы қан', 'Бірінші ұпайыңды ал.'],
    duelWin: ['Арена жеңімпазы', 'Кез келген PvP раундта жең.'],
    survivor: ['Әлі тірі', 'Зомби режимінде аман қал.'],
    builder: ['Кішкентай сәулетші', 'Бір раундта 3 баррикада қой.'],
    grenadier: ['Бум дос', 'Grenade Mayhem режимінде ұпай ал.'],
    zombieHunter: ['Тазалау тобы', 'Бір раундта 10 зомбиді жең.'],
    silentSurvivor: ['Тыныш аңыз', 'Бірде-бір оқ атпай раундтан аман қал.'],
    selfDestruct: ['Өзін-өзі жою', 'Өз гранатаңнан өл.'],
    easyBotOops: ['Бұл қалай болды?', 'Easy ботқа жеңіл.'],
    painSpeedrun: ['Ауырсыну speedrun', 'Термоядролық ботқа қарсы 1 ұпай ал.'],
    disappointment3: ['Көңіл қалу III', 'Қонақ болып ресми серверге кіріп көр.'],
    modeMaster: ['Барлық режим чемпионы', 'Барлық ойын режимінде жең.'],
    mapTour: ['Мылтықты турист', 'Барлық кәдімгі карталарда ойна.'],
  },
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
  { id: 'painSpeedrun', title: 'Pain Speedrun', description: 'Score against the bot on Thermonuclear.' },
  { id: 'disappointment3', title: 'Disappointment III', description: 'Try to join the official server as a guest.' },
  { id: 'qSpam', title: 'QQQQQQQQQQQ', description: 'QQQQQQQQQQQQQ' },
  { id: 'updateConfusion', title: 'это что такое', description: 'обновите игру' },
  { id: 'adminServer', title: 'да я админ', description: 'играйте на 1 сервере с создателем игры' },
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
  painSpeedrun: ['Спидран боли', 'Набери хотя бы 1 очко против термоядерного бота.'],
  disappointment3: ['Разочарование III', 'Попытайся зайти на официальный сервер за гостя.'],
  qSpam: ['QQQQQQQQQQQ', 'QQQQQQQQQQQQQ'],
  updateConfusion: ['это что такое', 'обновите игру'],
  adminServer: ['да я админ', 'играйте на 1 сервере с создателем игры'],
  modeMaster: ['Чемпион всех режимов', 'Победи во всех режимах игры.'],
  mapTour: ['Турист с пушкой', 'Сыграй на всех обычных картах.'],
};

import type { GameMode, MapId } from './arenaTypes';
import type { Language } from './gameSettings';

type ModeText = Record<Language, [string, string]>;
type MapText = Record<Language, string>;

const modes: Record<GameMode, ModeText> = {
  duel: makeMode(
    ['Duel', 'Classic two-player fight to 5 points.'],
    ['Дуэль', 'Классический бой двух игроков до 5 очков.'],
    ['Duelo', 'Combate clásico de dos jugadores hasta 5 puntos.'],
    ['Duell', 'Klassischer Kampf für zwei Spieler bis 5 Punkte.'],
    ['Duel', 'Combat classique à deux joueurs jusqu’à 5 points.'],
    ['Дуэль', 'Екі ойыншының 5 ұпайға дейінгі классикалық шайқасы.'],
  ),
  quickDraw: makeMode(
    ['Quick Draw', 'Fast round. Every hit is lethal, first to 3.'],
    ['Быстрый выстрел', 'Короткий раунд: любое попадание смертельно, игра до 3.'],
    ['Disparo rápido', 'Ronda rápida: cada golpe mata, gana quien llegue a 3.'],
    ['Schnellschuss', 'Kurze Runde: jeder Treffer ist tödlich, zuerst bis 3.'],
    ['Tir rapide', 'Manche rapide : chaque touche est fatale, premier à 3.'],
    ['Жылдам ату', 'Қысқа раунд: әр соққы қауіпті, 3 ұпайға дейін.'],
  ),
  blitz: makeMode(
    ['Blitz', 'Twenty-five seconds, first to 3. No warmup.'],
    ['Блиц', '25 секунд, первый до 3. Без разогрева.'],
    ['Blitz', 'Veinticinco segundos, primero a 3. Sin calentamiento.'],
    ['Blitz', '25 Sekunden, zuerst bis 3. Kein Aufwärmen.'],
    ['Blitz', '25 secondes, premier à 3. Pas d’échauffement.'],
    ['Блиц', '25 секунд, 3 ұпайға бірінші жеткен жеңеді.'],
  ),
  tankDuel: makeMode(
    ['Tank Duel', 'Big health bars and longer trades.'],
    ['Танковая дуэль', 'Больше здоровья и дольше перестрелки.'],
    ['Duelo tanque', 'Más salud y duelos más largos.'],
    ['Panzerduell', 'Mehr Leben und längere Gefechte.'],
    ['Duel blindé', 'Plus de vie et des échanges plus longs.'],
    ['Танк дуэлі', 'Көбірек денсаулық және ұзақ атыс.'],
  ),
  railDuel: makeMode(
    ['Rail Duel', 'Railguns only. Slow shots, scary damage.'],
    ['Рельсовая дуэль', 'Только рейлган: медленно, но больно.'],
    ['Duelo railgun', 'Solo railguns. Disparos lentos, daño enorme.'],
    ['Railgun-Duell', 'Nur Railguns. Langsame Schüsse, starker Schaden.'],
    ['Duel railgun', 'Railguns seulement. Tirs lents, gros dégâts.'],
    ['Рейлган дуэлі', 'Тек рейлган: баяу, бірақ өте ауыр.'],
  ),
  grenadeMayhem: makeMode(
    ['Grenade Mayhem', 'Fast grenades, loud explosions, first to 5.'],
    ['Гранатный хаос', 'Быстрые гранаты, громкие взрывы, игра до 5.'],
    ['Caos de granadas', 'Granadas rápidas, explosiones fuertes, primero a 5.'],
    ['Granatenchaos', 'Schnelle Granaten, laute Explosionen, zuerst bis 5.'],
    ['Chaos de grenades', 'Grenades rapides, grosses explosions, premier à 5.'],
    ['Граната хаосы', 'Жылдам гранаталар, қатты жарылыстар, 5 ұпайға дейін.'],
  ),
  flameDuel: makeMode(
    ['Flamethrower Fight', 'Only flamethrowers. Get close and melt the arena.'],
    ['Бой огнемётами', 'Только огнемёты: подойди ближе и прожарь арену.'],
    ['Batalla de lanzallamas', 'Solo lanzallamas. Acércate y derrite la arena.'],
    ['Flammenwerfer-Kampf', 'Nur Flammenwerfer. Komm nah ran und schmelze die Arena.'],
    ['Combat lance-flammes', 'Lance-flammes seulement. Approche et fais fondre l’arène.'],
    ['Отшашқыш шайқасы', 'Тек отшашқыштар: жақындап аренаны өртте.'],
  ),
  paintBattle: makeMode(
    ['Paint Battle', 'Leave paint trails while moving. Highest map coverage wins.'],
    ['Битва краской', 'Бегай и оставляй краску. Побеждает тот, кто закрасил больше карты.'],
    ['Batalla de pintura', 'Deja pintura al moverte. Gana quien cubra más mapa.'],
    ['Farbschlacht', 'Hinterlasse Farbe beim Laufen. Die größte Fläche gewinnt.'],
    ['Bataille de peinture', 'Laisse une trace de peinture. La plus grande zone gagne.'],
    ['Бояу шайқасы', 'Жүргенде бояу қалдыр. Картаны көбірек бояған жеңеді.'],
  ),
  miniGames: makeMode(
    ['Mini Games', 'Ten mini-games, thirty seconds each. Adapt fast.'],
    ['Mini Games', '10 мини-игр по 30 секунд. Правила постоянно меняются.'],
    ['Mini juegos', 'Diez mini juegos de 30 segundos. Adáptate rápido.'],
    ['Mini Games', 'Zehn Minispiele je 30 Sekunden. Passe dich schnell an.'],
    ['Mini-jeux', 'Dix mini-jeux de 30 secondes. Adapte-toi vite.'],
    ['Mini Games', '30 секундтық 10 мини-ойын. Ережелер тез өзгереді.'],
  ),
  mutationStorm: makeMode(
    ['Mutations', 'Every 15 seconds a new mutation stacks onto the round.'],
    ['Мутации', 'Каждые 15 секунд появляется новая мутация и складывается с прошлыми.'],
    ['Mutaciones', 'Cada 15 segundos se acumula una nueva mutación.'],
    ['Mutationen', 'Alle 15 Sekunden stapelt sich eine neue Mutation.'],
    ['Mutations', 'Toutes les 15 secondes, une nouvelle mutation s empile.'],
    ['Мутациялар', 'Әр 15 секунд сайын жаңа мутация қосылады.'],
  ),
  spleef: makeMode(
    ['Spleef', 'Shoot the floor under the enemy and make them fall.'],
    ['Сплиф', 'Разрушай плиты под врагом и сбрасывай его вниз.'],
    ['Spleef', 'Dispara al suelo bajo el enemigo y hazlo caer.'],
    ['Spleef', 'Schieße den Boden unter dem Gegner weg.'],
    ['Spleef', 'Détruis le sol sous l’ennemi pour le faire tomber.'],
    ['Сплиф', 'Жаудың астындағы плиталарды бұзып құлат.'],
  ),
  tileRun: makeMode(
    ['Run', 'Tiles break after you step on them. Keep moving.'],
    ['Ран', 'Плиты ломаются после шага. Остановишься - упадёшь.'],
    ['Run', 'Las losas se rompen al pisarlas. Sigue moviéndote.'],
    ['Run', 'Platten brechen nach dem Betreten. Bleib in Bewegung.'],
    ['Run', 'Les dalles cassent après ton passage. Continue de bouger.'],
    ['Ран', 'Плиталар басқаннан кейін сынады. Тоқтама.'],
  ),
  hideSeek: makeMode(
    ['Hide and Seek', 'Stand behind cover to vanish, ambush, and survive.'],
    ['Прятки', 'Спрячься за телом предмета: игрок исчезнет, можно делать засаду.'],
    ['Escondite', 'Ponte tras objetos para desaparecer, emboscar y sobrevivir.'],
    ['Verstecken', 'Verstecke dich hinter Objekten, verschwinde und greife aus dem Hinterhalt an.'],
    ['Cache-cache', 'Cache-toi derrière les objets pour disparaître et tendre une embuscade.'],
    ['Тығылмақ', 'Заттың артына тығыл: ойыншы көрінбей қалады.'],
  ),
  hungerGames: makeMode(
    ['Hunger Games', 'Scavenge power-ups and lucky blocks. Last fighter wins the trades.'],
    ['Голодные игры', 'Собирай бонусы и лаки-блоки. Выживает тот, кто лучше лутается.'],
    ['Juegos del hambre', 'Busca mejoras y bloques de suerte. Gana quien sobreviva mejor.'],
    ['Hungerspiele', 'Sammle Power-ups und Glücksblöcke. Der beste Loot gewinnt.'],
    ['Jeux de la faim', 'Ramasse bonus et lucky blocks. Le meilleur loot gagne.'],
    ['Аштық ойындары', 'Бонустар мен lucky block жина. Жақсы лут алған жеңеді.'],
  ),
  swapRift: makeMode(
    ['Swap Rift', 'Step into a rift to swap places with the enemy.'],
    ['Разлом обмена', 'Зайди в разлом, чтобы мгновенно поменяться местами с врагом.'],
    ['Grieta de intercambio', 'Entra en la grieta para cambiar lugar con el enemigo.'],
    ['Tauschspalt', 'Betritt den Spalt und tausche sofort den Platz mit dem Gegner.'],
    ['Faille d’échange', 'Entre dans la faille pour échanger ta place avec l’ennemi.'],
    ['Алмасу жарығы', 'Жарыққа кіріп, жаумен орын ауыстыр.'],
  ),
  timeDuel: makeMode(
    ['5D Duel', 'Past and future echoes exist on the arena. Do not shoot your own timeline.'],
    ['5D дуэль', 'На арене есть эхо прошлого и будущего. Не стреляй в свою временную линию.'],
    ['Duelo 5D', 'Hay ecos del pasado y futuro en la arena. No dispares a tu propia línea temporal.'],
    ['5D-Duell', 'Vergangenheits- und Zukunftsechos sind in der Arena. Schieße nicht auf deine eigene Zeitlinie.'],
    ['Duel 5D', 'Des échos du passé et du futur sont dans l’arène. Ne tire pas sur ta propre ligne temporelle.'],
    ['5D дуэль', 'Аренада өткен және болашақ жаңғырықтары бар. Өз уақыт сызығыңа атпа.'],
  ),
  craftSurvival: makeMode(
    ['Survival', 'Build a barricade base during peace time. Weapons unlock later.'],
    ['Выживание', 'В мирное время строй базу из баррикад без перезарядки. Потом включается оружие.'],
    ['Supervivencia', 'Construye una base en paz. Las armas se activan después.'],
    ['Überleben', 'Baue in der Friedenszeit eine Barrikadenbasis. Waffen kommen später.'],
    ['Survie', 'Construis une base pendant la paix. Les armes arrivent plus tard.'],
    ['Аман қалу', 'Бейбіт кезде баррикададан база құр. Қару кейін қосылады.'],
  ),
  lavaSurvival: makeMode(
    ['Lava Survival', 'Escape a random maze while a lava tsunami chases everyone.'],
    ['Выживание лавы', 'Выберись из случайного лабиринта, пока сзади идёт цунами из лавы.'],
    ['Supervivencia de lava', 'Escapa de un laberinto aleatorio mientras te persigue un tsunami de lava.'],
    ['Lava-Überleben', 'Entkomme einem zufälligen Labyrinth, während eine Lavawelle euch jagt.'],
    ['Survie lave', 'Échappe à un labyrinthe aléatoire pendant qu’un tsunami de lave avance.'],
    ['Лавадан аман қалу', 'Лава толқыны қуып келе жатқанда кездейсоқ лабиринттен шық.'],
  ),
  swordDuel: makeMode(
    ['Sword Fights', 'No guns or grenades. Close in and slash with swords.'],
    ['Бои на мечах', 'Без пушек и гранат: подойди ближе и бей мечом.'],
    ['Combate de espadas', 'Sin armas ni granadas. Acércate y golpea con espada.'],
    ['Schwertkämpfe', 'Keine Waffen oder Granaten. Geh nah ran und schlage zu.'],
    ['Combat à l’épée', 'Pas d’armes ni grenades. Approche et frappe.'],
    ['Қылыш шайқасы', 'Қару мен граната жоқ: жақындап қылышпен соқ.'],
  ),
  swarmNight: makeMode(
    ['Swarm Night', 'Lots of weak zombies rush the arena.'],
    ['Ночь толпы', 'Много слабых зомби бегут на арену.'],
    ['Noche de horda', 'Muchos zombis débiles invaden la arena.'],
    ['Schwarmnacht', 'Viele schwache Zombies stürmen die Arena.'],
    ['Nuit de horde', 'Beaucoup de zombies faibles foncent dans l’arène.'],
    ['Топ түні', 'Көп әлсіз зомби аренаға жүгіреді.'],
  ),
  nightmare: makeMode(
    ['Nightmare', 'Tough zombies hit harder and survive longer.'],
    ['Кошмар', 'Зомби крепче, больнее бьют и дольше живут.'],
    ['Pesadilla', 'Zombis más duros, pegan más fuerte y viven más.'],
    ['Albtraum', 'Zombies sind härter, stärker und leben länger.'],
    ['Cauchemar', 'Zombies plus solides, plus violents et plus résistants.'],
    ['Қорқыныш', 'Зомбилер мықтырақ, қаттырақ ұрады және ұзақ өмір сүреді.'],
  ),
  fortress: makeMode(
    ['Fortress', 'More time to build, but the siege lasts longer.'],
    ['Крепость', 'Больше времени на строительство, но осада длиннее.'],
    ['Fortaleza', 'Más tiempo para construir, pero el asedio dura más.'],
    ['Festung', 'Mehr Bauzeit, aber die Belagerung dauert länger.'],
    ['Forteresse', 'Plus de temps pour construire, mais le siège dure plus longtemps.'],
    ['Қамал', 'Құрылысқа көбірек уақыт, бірақ қоршау ұзақ.'],
  ),
  endlessDuel: makeMode(
    ['Endless Duel', 'No timer. Fight until someone reaches 7 points.'],
    ['Бесконечная дуэль', 'Без таймера: бой до 7 очков.'],
    ['Duelo infinito', 'Sin temporizador. Lucha hasta 7 puntos.'],
    ['Endlosduell', 'Kein Timer. Kampf bis 7 Punkte.'],
    ['Duel infini', 'Sans minuteur. Combat jusqu’à 7 points.'],
    ['Шексіз дуэль', 'Таймер жоқ: 7 ұпайға дейін шайқас.'],
  ),
  disasters: makeMode(
    ['Disaster Survival', 'Survive fires, storms, quakes, and floods for 70 seconds.'],
    ['Выживание в катастрофах', 'Переживи огонь, бурю, землетрясение и волну 70 секунд.'],
    ['Supervivencia de desastres', 'Sobrevive fuego, tormentas, terremotos e inundaciones 70 segundos.'],
    ['Katastrophen-Überleben', 'Überlebe Feuer, Sturm, Beben und Flut 70 Sekunden.'],
    ['Survie aux catastrophes', 'Survis au feu, aux tempêtes, séismes et vagues pendant 70 secondes.'],
    ['Апаттан аман қалу', 'От, дауыл, жер сілкінісі және тасқыннан 70 секунд аман қал.'],
  ),
  captureFlag: makeMode(
    ['Capture the Flag', 'Steal the enemy flag and bring it home. First to 3 captures.'],
    ['Захват флага', 'Укради флаг врага и принеси домой. Первый до 3 захватов.'],
    ['Captura la bandera', 'Roba la bandera enemiga y llévala a casa. Primero a 3.'],
    ['Flagge erobern', 'Stiehl die gegnerische Flagge und bring sie heim. Zuerst bis 3.'],
    ['Capture du drapeau', 'Vole le drapeau ennemi et ramène-le. Premier à 3.'],
    ['Туды алу', 'Жаудың туын алып, базаға жеткіз. 3 рет бірінші алған жеңеді.'],
  ),
  kingHill: makeMode(
    ['King of the Hill', 'Hold the center zone alone to score. First to 20.'],
    ['Царь горы', 'Удерживай центр в одиночку, чтобы получать очки. Первый до 20.'],
    ['Rey de la colina', 'Controla solo la zona central para puntuar. Primero a 20.'],
    ['König des Hügels', 'Halte die Mitte allein, um Punkte zu sammeln. Zuerst bis 20.'],
    ['Roi de la colline', 'Tiens seul la zone centrale pour marquer. Premier à 20.'],
    ['Төбе патшасы', 'Ұпай алу үшін ортаны жалғыз ұстап тұр. 20 ұпайға дейін.'],
  ),
  glassWars: makeMode(
    ['Glass Wars', 'Break the enemy glass core, then eliminate them for good.'],
    ['Стеклянные войны', 'Разбей стеклянное ядро врага, потом добей его окончательно.'],
    ['Guerras de cristal', 'Rompe el núcleo de cristal enemigo y elimínalo definitivamente.'],
    ['Glaskriege', 'Zerstöre den Glaskern des Gegners und besiege ihn endgültig.'],
    ['Guerres de verre', 'Brise le noyau de verre ennemi, puis élimine-le pour de bon.'],
    ['Әйнек соғысы', 'Жаудың әйнек өзегін бұзып, кейін толық жең.'],
  ),
  luckyBlocks: makeMode(
    ['Lucky Blocks', 'Break lucky blocks for wild buffs and curses. First to 5.'],
    ['Лаки блоки', 'Ломай лаки блоки ради бафов и проклятий. Первый до 5.'],
    ['Lucky Blocks', 'Rompe bloques de suerte para buffs y maldiciones. Primero a 5.'],
    ['Glücksblöcke', 'Zerbrich Glücksblöcke für Buffs und Flüche. Zuerst bis 5.'],
    ['Lucky Blocks', 'Casse des lucky blocks pour des bonus et malus. Premier à 5.'],
    ['Lucky Blocks', 'Бафтар мен қарғыстар үшін lucky block сындыр. 5 ұпайға дейін.'],
  ),
  zombies: makeMode(
    ['Zombie Rush', 'Build barricades and hold for 60 seconds.'],
    ['Зомби-рывок', 'Строй баррикады и держись 60 секунд.'],
    ['Ataque zombi', 'Construye barricadas y aguanta 60 segundos.'],
    ['Zombie-Ansturm', 'Baue Barrikaden und halte 60 Sekunden durch.'],
    ['Ruée zombie', 'Construis des barricades et tiens 60 secondes.'],
    ['Зомби шабуылы', 'Баррикада құрып, 60 секунд шыда.'],
  ),
};

const mapNames: Record<MapId, MapText> = {
  crossfire: makeMap('Crossfire', 'Перекрёстный огонь', 'Fuego cruzado', 'Kreuzfeuer', 'Feu croisé', 'Айқас атыс'),
  lanes: makeMap('Lanes', 'Линии', 'Líneas', 'Bahnen', 'Couloirs', 'Жолақтар'),
  bunker: makeMap('Bunker', 'Бункер', 'Búnker', 'Bunker', 'Bunker', 'Бункер'),
  open: makeMap('Open Field', 'Открытое поле', 'Campo abierto', 'Offenes Feld', 'Champ ouvert', 'Ашық алаң'),
  lavaMaze: makeMap('Lava Maze', 'Лавовый лабиринт', 'Laberinto de lava', 'Lavalabyrinth', 'Labyrinthe de lave', 'Лава лабиринті'),
  custom: makeMap('Custom Map', 'Своя карта', 'Mapa propio', 'Eigene Karte', 'Carte perso', 'Өз картаң'),
};

export function modeName(mode: GameMode, language: Language): string {
  return modes[mode][language][0];
}

export function modeDescription(mode: GameMode, language: Language): string {
  return modes[mode][language][1];
}

export function mapName(mapId: MapId, englishName: string, language: Language): string {
  return mapNames[mapId]?.[language] ?? englishName;
}

function makeMode(en: [string, string], ru: [string, string], es: [string, string], de: [string, string], fr: [string, string], kk: [string, string]): ModeText {
  return { en, ru, es, de, fr, kk };
}

function makeMap(en: string, ru: string, es: string, de: string, fr: string, kk: string): MapText {
  return { en, ru, es, de, fr, kk };
}

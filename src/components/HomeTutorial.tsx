import type { Language } from '../lib/gameSettings';

type TutorialCard = {
  group: string;
  title: string;
  text: string;
  tag: string;
};

const enCards: TutorialCard[] = [
  { group: 'Start', title: 'Controls', tag: 'Keys', text: 'Blue uses WASD. Red uses arrows, or WASD online. Shoot, throw grenades, sit with F/E, change weapons, and press R twice to restart.' },
  { group: 'Start', title: 'Goal', tag: 'Win', text: 'Most modes end by score or timer. Endless Duel ends only when somebody reaches the win score. More bots can raise the score target.' },
  { group: 'Editor', title: 'Building', tag: 'Blocks', text: 'Walls stop movement. Boards have health. Glass breaks from one bullet. Rugs are walkable. Crates, barrels, beds, sofas, shelves and plants are solid decor.' },
  { group: 'Editor', title: 'Terrain', tag: 'Floor', text: 'Grass fully hides players from bots and zombies. Water slows. Ice slides. Poison blocks vision and fades out smoothly.' },
  { group: 'Editor', title: 'Mechanisms', tag: 'Tech', text: 'Movers, pistons, sticky pistons, carousels, conveyors, magnets, lasers, portals, ricochet blocks, TNT and swap rifts can change how a map plays.' },
  { group: 'Editor', title: 'Map Editor', tag: 'Tools', text: 'Use categories, icons, brush size up to 20, map size 10x10 to 100x100, backgrounds, many save slots, custom blocks, allies and checkpoints.' },
  { group: 'Combat', title: 'Weapons', tag: 'Loadout', text: 'Weapons have different cooldowns. Some modes lock weapons: swords only in Sword Fight, flamethrowers only in Flamethrower Battle, custom weapons only on Custom Map.' },
  { group: 'Combat', title: 'Lucky Blocks', tag: 'Random', text: 'Break question cubes for buffs, weapons, healing, speed, curses and bad effects. Hunger Games can drop weapons from lucky blocks.' },
  { group: 'Modes', title: 'Mode Types', tag: 'Playlist', text: 'Modes are sorted into classic, zombie, strategy, arcade and other. Mini Games rotates rules every 30 seconds. Lava Survival makes players escape a maze before the lava wave catches them.' },
  { group: 'Modes', title: '5D Duel', tag: 'Secret', text: 'Past and future echoes appear. Do not shoot your own timeline. If portals break the edge of the arena, Far Arena can open until the round ends.' },
  { group: 'Online', title: 'Servers', tag: 'Multiplayer', text: 'Private rooms use a code. Public rooms appear in the list. Official servers are restricted for guests and support larger lobbies.' },
  { group: 'Online', title: 'Account', tag: 'Save', text: 'Sign in to save progress across browsers, publish maps, use normal chat and keep stats. Guests get a gray guest profile with limits.' },
  { group: 'Progress', title: 'Achievements', tag: 'Goals', text: 'Achievements unlock for wins, survival challenges, weird losses, map progress, self-grenade death and more. Toasts slide in smoothly.' },
  { group: 'Progress', title: 'Settings', tag: 'Options', text: 'Change language, FPS, low-spec mode, controls, bot difficulty up to Thermonuclear, bot weapons, music, dark mode, secret zombies and achievement popups.' },
];

const ruCards: TutorialCard[] = [
  { group: 'Старт', title: 'Управление', tag: 'Клавиши', text: 'Синий: WASD. Красный: стрелочки, а в онлайне тоже WASD. Стреляй, кидай гранаты, садись на F/E, меняй оружие, а R надо нажать два раза для рестарта.' },
  { group: 'Старт', title: 'Цель', tag: 'Победа', text: 'В большинстве режимов надо набрать очки или пережить таймер. Бесконечная дуэль идёт до победы. Чем больше ботов, тем выше может быть цель по очкам.' },
  { group: 'Редактор', title: 'Строительство', tag: 'Блоки', text: 'Стены не пропускают. Доски имеют здоровье. Стекло ломается от одной пули. По коврам можно ходить. Ящики, бочки, кровати, диваны, шкафы и растения мешают проходу.' },
  { group: 'Редактор', title: 'Поверхности', tag: 'Пол', text: 'Трава полностью прячет от ботов и зомби. Вода замедляет. Лёд заставляет скользить. Яд закрывает обзор и потом плавно проходит.' },
  { group: 'Редактор', title: 'Механизмы', tag: 'Техника', text: 'Двигатели, поршни, липкие поршни, карусели, конвейеры, магниты, лазеры, порталы, рикошет-блоки, TNT и разломы обмена сильно меняют карту.' },
  { group: 'Редактор', title: 'Редактор карт', tag: 'Инструменты', text: 'Есть категории, иконки блоков, кисть до 20, размер карты от 10x10 до 100x100, фоны, много слотов, кастом-блоки, союзники и чекпоинты.' },
  { group: 'Бой', title: 'Оружие', tag: 'Арсенал', text: 'У оружия разная задержка. Некоторые режимы блокируют выбор: мечи только в боях на мечах, огнемёты только в своём режиме, кастом-оружие только на Custom Map.' },
  { group: 'Бой', title: 'Лаки блоки', tag: 'Рандом', text: 'Ломай кубы с вопросом ради бафов, оружия, лечения, скорости, проклятий и плохих эффектов. В голодных играх из них может выпадать оружие.' },
  { group: 'Режимы', title: 'Типы режимов', tag: 'Список', text: 'Режимы отсортированы на классические, зомби, стратегии, аркады и другое. Mini Games меняет правила каждые 30 секунд. В выживании лавы надо выбраться из лабиринта до волны лавы.' },
  { group: 'Режимы', title: '5D Дуэль', tag: 'Секрет', text: 'На арене появляются эхо прошлого и будущего. Нельзя стрелять в свою линию времени. Если порталы сломают край карты, откроется ДЗ до конца раунда.' },
  { group: 'Онлайн', title: 'Серверы', tag: 'Мультиплеер', text: 'В приватные комнаты заходят по коду. Публичные видны в списке. Официальные серверы ограничены для гостей и поддерживают большие лобби.' },
  { group: 'Онлайн', title: 'Аккаунт', tag: 'Сейв', text: 'Войди в профиль, чтобы сохранять прогресс между браузерами, выкладывать карты, писать в обычный чат и копить статистику. Гость серый и с ограничениями.' },
  { group: 'Прогресс', title: 'Ачивки', tag: 'Цели', text: 'Ачивки дают за победы, выживание, странные поражения, карты, смерть от своей гранаты и другое. Уведомления появляются плавно.' },
  { group: 'Прогресс', title: 'Настройки', tag: 'Опции', text: 'Можно менять язык, FPS, режим для слабых ПК, управление, сложность ботов до Термоядерной, оружие ботов, музыку, тёмный режим, секретных зомби и ачивки.' },
];

export function HomeTutorial({ language }: { language: Language }) {
  const cards = language === 'ru' ? ruCards : enCards;
  const groups = [...new Set(cards.map((card) => card.group))];

  return (
    <section className="tutorial-panel">
      <div className="tutorial-heading">
        <p className="eyebrow">{language === 'ru' ? 'Справка' : 'Guide'}</p>
        <h2>{language === 'ru' ? 'Туториал по Duel Arena' : 'Duel Arena Tutorial'}</h2>
        <p>{language === 'ru' ? 'Короткий справочник по режимам, блокам, онлайну и странным секретам.' : 'A compact guide for modes, blocks, online play and strange secrets.'}</p>
      </div>

      {groups.map((group) => (
        <section className="tutorial-group" key={group}>
          <h3>{group}</h3>
          <div className="tutorial-grid">
            {cards.filter((card) => card.group === group).map((card) => (
              <article className="tutorial-card" key={`${card.group}-${card.title}`}>
                <span>{card.tag}</span>
                <strong>{card.title}</strong>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

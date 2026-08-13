import type { Language } from '../lib/gameSettings';

type TutorialItem = {
  title: string;
  text: string;
};

const enItems: TutorialItem[] = [
  { title: 'Movement', text: 'Move, aim with facing direction, shoot, throw grenades, and press R twice to restart a round.' },
  { title: 'Basic blocks', text: 'Walls stop movement. Boards break after shots. Glass breaks from one bullet. Ice makes players slide.' },
  { title: 'Terrain', text: 'Grass hides players from bots and zombies. Water slows movement. Map backgrounds are saved per custom slot.' },
  { title: 'Mechanisms', text: 'Movers push players, carousels act as big rotating cover, conveyors pull in your movement direction, magnets pull or push players and projectiles. Swap rifts trade both players places when touched.' },
  { title: 'TNT and portals', text: 'Blue TNT explodes once. Red TNT respawns. Gray TNT chains like a fuse. Blue and orange portals teleport players and shots.' },
  { title: 'Traps', text: 'Spikes hurt. Lava burns. Acid corrodes. Zap shocks and blocks shooting. Poison blinds vision for players and bots.' },
  { title: 'Lucky blocks', text: 'Lucky blocks break like Minecraft-style question cubes. They can drop strong buffs or bad curses that only appear from lucky blocks.' },
  { title: 'Modes', text: 'Play duels, zombies, capture the flag, disasters, king of the hill, glass wars, grenade chaos, and Lucky Blocks mode.' },
  { title: 'Map editor', text: 'Use slots, brush size up to 20, map size from 10x10 to 100x100, backgrounds, blocks, traps, allies, checkpoints, lucky blocks, and a separate weapon editor. Custom weapons work on Custom Map with blue keys 4/5 and red keys 6/7.' },
  { title: 'Settings', text: 'Change language, FPS, low-spec mode, controls, bot difficulty, bot weapons, music, dark mode, and achievement popups.' },
  { title: 'Accounts', text: 'Open Profile to sign in and save progress, stats, achievements, settings, and custom map slots to your account.' },
  { title: 'Secrets', text: 'Secret zombies can appear after death if enabled. Hidden codes can unlock very unfair toys.' },
];

const ruItems: TutorialItem[] = [
  { title: 'Управление', text: 'Двигайся, стреляй, кидай гранаты, выбирай оружие. Чтобы перезапустить раунд, нажми R два раза подряд.' },
  { title: 'Базовые блоки', text: 'Стены стопают движение. Доски ломаются от выстрелов. Стекло ломается от одной пули. Лёд заставляет скользить.' },
  { title: 'Поверхности', text: 'Трава прячет игроков от ботов и зомби. Вода замедляет. Фон карты сохраняется отдельно для каждого слота.' },
  { title: 'Механизмы', text: 'Двигатели толкают игроков, карусель даёт большое вращающееся укрытие, конвейеры тянут по направлению движения, магниты притягивают или отталкивают.' },
  { title: 'TNT и порталы', text: 'Синий TNT одноразовый. Красный появляется снова. Серый запускает цепную реакцию как фитиль. Порталы телепортируют игроков и выстрелы.' },
  { title: 'Ловушки', text: 'Шипы ранят. Лава поджигает. Кислота разъедает. Электро даёт шок и блокирует стрельбу. Яд закрывает обзор игрокам и ботам.' },
  { title: 'Лаки блоки', text: 'Лаки блоки выглядят как майновские кубы с вопросом. После разрушения дают сильные бафы или плохие эффекты, которые выпадают только из них.' },
  { title: 'Режимы', text: 'Есть дуэли, зомби, захват флага, катастрофы, царь горы, стеклянные войны, гранатный хаос и режим Lucky Blocks.' },
  { title: 'Редактор карт', text: 'Есть слоты сохранений, кисть до 20, размер карты от 10x10 до 100x100, фоны, блоки, ловушки, союзники, чекпоинты, лаки блоки и редактор оружия для своей карты.' },
  { title: 'Настройки', text: 'Можно менять язык, FPS, режим для слабых ПК, управление, сложность бота, оружие бота, музыку, тёмный режим и уведомления ачивок.' },
  { title: 'Аккаунт', text: 'В профиле можно войти и сохранить прогресс: статистику, ачивки, настройки и все слоты кастомных карт.' },
  { title: 'Секреты', text: 'После смерти может появиться секретный зомби, если это включено. А ещё есть скрытые коды для нечестных игрушек.' },
];

export function HomeTutorial({ language }: { language: Language }) {
  const items = language === 'ru' ? ruItems : enItems;
  return (
    <section className="tutorial-panel">
      <div className="tutorial-heading">
        <p className="eyebrow">{language === 'ru' ? 'Справка' : 'Guide'}</p>
        <h2>{language === 'ru' ? 'Туториал по арене' : 'Arena Tutorial'}</h2>
      </div>
      <div className="tutorial-grid">
        {items.map((item) => (
          <article className="tutorial-card" key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

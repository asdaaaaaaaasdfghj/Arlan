import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { loadGameSettings } from '../lib/gameSettings';
import { installPublishedMap, loadPublishedMaps, type PublishedMap } from '../lib/publishedMaps';
import { isSupabaseConfigured } from '../lib/supabase';
import './map-editor.css';
import './map-catalog.css';

export function MapCatalogPage() {
  const [language] = useState(loadGameSettings().language);
  const [, navigate] = useLocation();
  const [maps, setMaps] = useState<PublishedMap[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const ru = language === 'ru';

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('error');
      setMessage(ru ? 'Supabase не настроен, каталог не загрузится.' : 'Supabase is not configured.');
      return;
    }

    loadPublishedMaps()
      .then((items) => {
        setMaps(items);
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Catalog failed');
      });
  }, [ru]);

  function playMap(map: PublishedMap) {
    installPublishedMap(map);
    navigate('/game?map=custom');
  }

  function saveMap(map: PublishedMap) {
    installPublishedMap(map);
    setMessage(ru ? 'Карта сохранена в активный слот.' : 'Map saved to your active slot.');
  }

  return (
    <main className="map-catalog-page">
      <nav className="menu-nav">
        <Link href="/">{ru ? 'Главная' : 'Home'}</Link>
        <Link href="/editor">{ru ? 'Редактор' : 'Editor'}</Link>
        <Link href="/game?map=custom">{ru ? 'Играть custom' : 'Play custom'}</Link>
      </nav>
      <header className="catalog-header">
        <p className="eyebrow">{ru ? 'Карты игроков' : 'Player maps'}</p>
        <h1>{ru ? 'Каталог карт' : 'Map catalog'}</h1>
        <p>{ru ? 'Забирай карты других игроков в свой активный слот или сразу запускай.' : 'Save player-made maps to your active slot or launch them right away.'}</p>
      </header>

      {message && <p className="catalog-message">{message}</p>}
      {status === 'loading' && <p className="catalog-message">{ru ? 'Загружаю карты...' : 'Loading maps...'}</p>}
      {status === 'ready' && maps.length === 0 && <p className="catalog-message">{ru ? 'Пока никто не выложил карты.' : 'No maps published yet.'}</p>}

      <section className="catalog-grid">
        {maps.map((map) => (
          <article className="catalog-card" key={map.id}>
            <MapPreview map={map} />
            <div>
              <strong>{map.title}</strong>
              <span>{formatMapInfo(map, ru)}</span>
            </div>
            <footer>
              <button type="button" onClick={() => playMap(map)}>{ru ? 'Играть' : 'Play'}</button>
              <button type="button" className="ghost-button" onClick={() => saveMap(map)}>{ru ? 'Забрать' : 'Save'}</button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

function MapPreview({ map }: { map: PublishedMap }) {
  const cells = map.map_data.cells ?? [];
  const cols = Math.max(10, Math.min(100, Math.round(map.map_data.size?.cols ?? 20)));
  const rows = Math.max(10, Math.min(100, Math.round(map.map_data.size?.rows ?? 12)));

  return (
    <div className={`catalog-preview editor-theme-${map.map_data.theme ?? 'arena'}`}>
      {cells.slice(0, 220).map((cell, index) => (
        <span
          className={`${cell.kind ?? 'wall'}-cell`}
          style={{
            left: `${((cell.col ?? 0) / cols) * 100}%`,
            top: `${((cell.row ?? 0) / rows) * 100}%`,
            width: `${100 / cols}%`,
            height: `${100 / rows}%`,
          }}
          key={`${cell.col}-${cell.row}-${index}`}
        />
      ))}
    </div>
  );
}

function formatMapInfo(map: PublishedMap, ru: boolean): string {
  const cells = map.map_data.cells?.length ?? 0;
  const size = map.map_data.size ? `${map.map_data.size.cols ?? 20}x${map.map_data.size.rows ?? 12}` : '20x12';
  return ru ? `${size}, блоков: ${cells}` : `${size}, blocks: ${cells}`;
}

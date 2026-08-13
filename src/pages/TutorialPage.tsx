import { useState } from 'react';
import { Link } from 'wouter';
import { HomeTutorial } from '../components/HomeTutorial';
import { loadGameSettings } from '../lib/gameSettings';
import { t } from '../lib/i18n';
import './home.css';

export function TutorialPage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;

  return (
    <main className="home-page tutorial-page">
      <nav className="menu-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <Link href="/editor">{t(language, 'mapEditor')}</Link>
      </nav>
      <HomeTutorial language={language} />
    </main>
  );
}

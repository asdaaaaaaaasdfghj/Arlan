import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { OnlinePage } from './pages/OnlinePage';
import { MapEditorPage } from './pages/MapEditorPage';
import { MapCatalogPage } from './pages/MapCatalogPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TutorialPage } from './pages/TutorialPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  useLegacyGithubRouteRedirect();

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/game" component={GamePage} />
        <Route path="/online" component={OnlinePage} />
        <Route path="/editor" component={MapEditorPage} />
        <Route path="/catalog" component={MapCatalogPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/tutorial" component={TutorialPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
}

function useLegacyGithubRouteRedirect() {
  if (!window.location.hostname.endsWith('github.io') || window.location.hash) {
    return;
  }

  const parts = window.location.pathname.split('/').filter(Boolean);
  const legacyRoute = parts.slice(1).join('/');
  if (legacyRoute) {
    window.history.replaceState(null, '', `/${parts[0]}/#/${legacyRoute}${window.location.search}`);
  }
}

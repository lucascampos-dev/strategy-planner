import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { IndicatorsPage } from './pages/IndicatorsPage';
import { InitiativesPage } from './pages/InitiativesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ObjectivesPage } from './pages/ObjectivesPage';
import { TimelinePage } from './pages/TimelinePage';
import { PlanProvider } from './state/PlanContext';

/**
 * HashRouter keeps deep links working on static hosting (GitHub Pages) without
 * any server-side rewrite rules.
 */
export function App() {
  return (
    <PlanProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="objectives" element={<ObjectivesPage />} />
            <Route path="initiatives" element={<InitiativesPage />} />
            <Route path="indicators" element={<IndicatorsPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </PlanProvider>
  );
}

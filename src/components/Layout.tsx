import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { isAtRisk } from '../domain/logic';
import { COMPANY_NAME } from '../domain/seed';
import { useDerived, usePlan } from '../state/usePlan';
import { Icon, type IconName } from './Icon';
import { ConfirmDialog } from './Modal';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  count?: number;
}

export function Layout() {
  const { plan, resetDemo } = usePlan();
  const { initiatives } = useDerived();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const location = useLocation();

  // Close the mobile drawer on navigation.
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const atRisk = initiatives.filter((i) => isAtRisk(i.assessment.health)).length;

  const items: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/objectives', label: 'Objectives', icon: 'target', count: plan.objectives.length },
    { to: '/initiatives', label: 'Initiatives', icon: 'rocket', count: plan.initiatives.length },
    { to: '/indicators', label: 'Indicators', icon: 'gauge', count: plan.indicators.length },
    { to: '/timeline', label: 'Timeline', icon: 'timeline' },
  ];

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="target" />
          </span>
          <span className="brand-name">Strategy Planner</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" size={22} />
        </button>
      </div>

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside id="sidebar" className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Main">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="target" size={20} />
          </span>
          <div>
            <div className="brand-name">Strategy Planner</div>
            <div className="brand-sub">{COMPANY_NAME} · FY plan</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Workspace</div>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <Icon name={item.icon} />
              {item.label}
              {item.count !== undefined && <span className="nav-count">{item.count}</span>}
            </NavLink>
          ))}
        </nav>

        {atRisk > 0 && (
          <Link to="/initiatives?health=attention" className="attention-link">
            <Icon name="alert" size={15} />
            {atRisk} initiative{atRisk === 1 ? '' : 's'} need attention
          </Link>
        )}

        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={() => setConfirmReset(true)}
          >
            <Icon name="reset" size={15} />
            Reset demo data
          </button>
          <span>Data is stored in this browser only.</span>
        </div>
      </aside>

      <main className="content" id="main">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>

      {confirmReset && (
        <ConfirmDialog
          title="Reset demo data?"
          message="All objectives, initiatives, indicators and measurements will be replaced by the original demo dataset. Changes you made in this browser will be lost."
          confirmLabel="Reset data"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetDemo();
            setConfirmReset(false);
            setToast('Demo data restored');
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

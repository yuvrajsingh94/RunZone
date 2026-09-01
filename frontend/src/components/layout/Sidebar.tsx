import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Map,
  ShieldAlert,
  Bot,
  ListTree,
  Trophy,
  User as UserIcon,
  LogOut,
  Shield,
} from 'lucide-react';
import { PrivacyModal } from '../common/PrivacyModal';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/territories', label: 'Territory map', icon: Map },
  { path: '/analytics', label: 'Fatigue & ACWR', icon: ShieldAlert },
  { path: '/coach', label: 'AI coach', icon: Bot },
  { path: '/activities', label: 'Activity log', icon: ListTree },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/profile', label: 'Athlete settings', icon: UserIcon },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <aside
        className="w-56 bg-night hairline-r flex flex-col justify-between py-4 px-2.5 hidden md:flex min-h-[calc(100vh-3.5rem)] shrink-0"
        aria-label="Sidebar navigation"
      >
        <div className="space-y-6">
          {/* Navigation Section */}
          <div>
            <div className="px-2.5 text-[11px] font-sans font-medium text-chalk-dim mb-2">
              Navigation
            </div>
            <nav className="space-y-0.5" aria-label="Main menu">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 text-xs font-sans transition-colors ${
                        isActive
                          ? 'bg-panel text-chalk font-medium border-l-2 border-cinder'
                          : 'text-chalk-muted hover:text-chalk hover:bg-panel/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-chalk-dim" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Athlete Overview Block */}
          {user && (
            <div className="mx-1 p-3 bg-panel border border-hairline space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-chalk font-display font-semibold">{user.username}</span>
                <span className="text-[10px] text-chalk-muted font-display tabular">Lvl {user.level}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 hairline-t text-[11px]">
                <div>
                  <div className="text-chalk-dim text-[10px]">Territory</div>
                  <div className="font-display font-semibold text-chalk tabular">
                    {(user.total_territory_km2 || 0).toFixed(2)} km²
                  </div>
                </div>
                <div>
                  <div className="text-chalk-dim text-[10px]">Distance</div>
                  <div className="font-display font-semibold text-chalk tabular">
                    {(user.total_distance_km || 0).toFixed(1)} km
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / System Status & Privacy */}
        <div className="space-y-2 pt-3 hairline-t">
          <button
            onClick={() => setPrivacyOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-chalk-dim hover:text-chalk hover:bg-panel transition-colors text-left"
          >
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Privacy & Telemetry</span>
          </button>

          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-chalk-dim hover:text-chalk hover:bg-panel transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          )}

          <div className="px-2.5 text-[10px] font-sans text-chalk-dim flex items-center justify-between">
            <span>PostGIS Engine</span>
            <span className="text-contour">Active</span>
          </div>
        </div>
      </aside>

      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
};

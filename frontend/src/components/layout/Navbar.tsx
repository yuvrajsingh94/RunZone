import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Plus, UploadCloud, Play, Radio, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onOpenLiveTracker: () => void;
  onOpenSimulate: () => void;
  onOpenManual: () => void;
  onOpenGPX: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLiveTracker,
  onOpenSimulate,
  onOpenManual,
  onOpenGPX,
}) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Overview' },
    { path: '/territories', label: 'Territory map' },
    { path: '/analytics', label: 'Fatigue & ACWR' },
    { path: '/coach', label: 'Coach' },
    { path: '/activities', label: 'Activities' },
    { path: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="h-14 bg-night hairline-b sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
      {/* Brand & Desktop Links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 group" aria-label="RunZone home">
          <span className="w-2.5 h-2.5 bg-cinder inline-block" />
          <span className="font-display font-bold text-lg tracking-tight text-chalk">
            RunZone
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-chalk bg-panel border-b-2 border-cinder'
                    : 'text-chalk-muted hover:text-chalk hover:bg-panel/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Action Strip */}
      <div className="flex items-center gap-2">
        {/* Live GPS Tracker Button */}
        <button
          onClick={onOpenLiveTracker}
          aria-label="Track live GPS run"
          className="bg-cinder hover:bg-cinder-hover active:bg-cinder-active text-chalk text-xs font-medium px-3.5 py-1.5 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Radio className="w-3.5 h-3.5 text-white animate-pulse" aria-hidden="true" />
          <span className="font-display font-semibold tracking-tight">Record run</span>
        </button>

        <button
          onClick={onOpenSimulate}
          aria-label="Simulate a GPS route"
          className="hidden sm:flex bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors items-center gap-1.5"
        >
          <Play className="w-3 h-3 fill-current text-chalk-dim" aria-hidden="true" />
          <span>Simulate</span>
        </button>

        <button
          onClick={onOpenGPX}
          aria-label="Import a GPX file"
          className="hidden lg:flex items-center gap-1.5 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors"
        >
          <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Import GPX</span>
        </button>

        <button
          onClick={onOpenManual}
          aria-label="Log a workout manually"
          className="hidden lg:flex items-center gap-1 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk border border-hairline text-xs font-medium px-3 py-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Log</span>
        </button>

        {/* User Pill */}
        {user ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-3 ml-1 hairline-l group"
            aria-label={`Athlete profile for ${user.username}`}
          >
            <div className="w-6 h-6 bg-panel border border-hairline flex items-center justify-center text-xs font-display font-bold text-chalk">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs text-chalk font-medium leading-none">
                {user.username}
              </div>
              <div className="text-[11px] text-chalk-muted tabular leading-tight mt-0.5">
                {(user.total_territory_km2 || 0).toFixed(2)} km²
              </div>
            </div>
          </Link>
        ) : (
          <Link
            to="/login"
            className="bg-panel hover:bg-panel-light text-chalk text-xs font-medium px-3 py-1.5 border border-hairline transition-colors"
          >
            Sign in
          </Link>
        )}

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          className="md:hidden p-1.5 bg-panel border border-hairline text-chalk-muted hover:text-chalk ml-1"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-night hairline-b p-3 space-y-1 z-50">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 text-xs font-medium ${
                location.pathname === link.path
                  ? 'text-chalk bg-panel text-cinder font-semibold'
                  : 'text-chalk-muted hover:text-chalk'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 hairline-t grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLiveTracker();
              }}
              className="bg-cinder text-chalk text-xs py-2 font-medium"
            >
              Record Run
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSimulate();
              }}
              className="bg-panel text-chalk text-xs py-2 border border-hairline"
            >
              Simulate
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

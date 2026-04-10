'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const nav = [
  { href: '/dashboard',            label: 'Dashboard',       icon: '▦' },
  { href: '/flows',                label: 'Flows',           icon: '◈' },
  { href: '/activation',           label: 'Activation',      icon: '◎' },
  { href: '/users',                label: 'Users',           icon: '◉' },
  { href: '/escalations',          label: 'Escalations',     icon: '◬' },
  { href: '/conversations',        label: 'Conversations',   icon: '◷' },
  { href: '/analytics',            label: 'Analytics',       icon: '◱' },
  { href: '/settings/knowledge',   label: 'Knowledge Base',  icon: '◫' },
  { href: '/settings/ai',          label: 'AI Config',       icon: '◈' },
  { href: '/settings/widget',      label: 'Widget',          icon: '◆' },
  { href: '/settings/billing',     label: 'Billing',         icon: '◇' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, org, logout } = useAuthStore();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <span className="text-lg font-bold text-brand-600">Prism</span>
        {org && <p className="text-xs text-slate-400 mt-0.5 truncate">{org.name}</p>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{user?.name ?? user?.email}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-xs text-slate-500 hover:text-red-600 text-left transition-colors py-1"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

'use client';

import React from 'react';
import styles from './Sidebar.module.css';
import {
  DashboardIcon,
  SendIcon,
  TemplateIcon,
  SettingsIcon,
  LogOutIcon,
  UserIcon,
  ShortfundlyLogoSymbol,
} from './Icons';

export default function Sidebar({ activeTab, setActiveTab, session, onLogout }) {
  const role = session?.role || 'manager';
  const canSend = session?.role === 'admin' || session?.role === 'team_lead' || Boolean(session?.can_send);

  const getRoleClass = (r) => {
    if (r === 'admin') return styles.roleAdmin;
    if (r === 'team_lead') return styles.roleTeamLead;
    return styles.roleManager;
  };

  const getRoleLabel = (r) => {
    if (r === 'admin') return 'Admin';
    if (r === 'team_lead') return 'Team Lead';
    return 'Manager';
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon size={18} />,
    },
    {
      id: 'sender',
      label: 'Manual Email Sender',
      icon: <SendIcon size={18} />,
    },
    {
      id: 'templates',
      label: 'Email Templates',
      icon: <TemplateIcon size={18} />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon size={18} />,
      badge: role === 'admin' ? 'Admin' : null,
    },
  ];

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brandArea}>
        <ShortfundlyLogoSymbol size={40} className={styles.logoImg} />
        <div className={styles.brandText}>
          <div className={styles.portalTitle}>Shortfundly</div>
          <div className={styles.tagline} style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>Campus Outreach</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={styles.navSection}>
        <div className={styles.navLabel}>Outreach Management</div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <span className={styles.roleTag}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Status & Logout Footer */}
      <div className={styles.footerSection}>
        <div className={styles.userCard}>
          <div className={styles.userEmailRow}>
            <UserIcon size={14} />
            <span title={session?.email || 'User'}>{session?.email || 'Authenticated User'}</span>
          </div>
          <div className={styles.roleRow}>
            <span className={`${styles.rolePill} ${getRoleClass(role)}`}>
              {getRoleLabel(role)}
            </span>
            <span className={`${styles.sendPill} ${canSend ? styles.sendActive : styles.sendDisabled}`}>
              {canSend ? 'Dispatch Enabled' : 'View Only'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
          title="Sign out of Shortfundly Outreach Portal"
        >
          <LogOutIcon size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

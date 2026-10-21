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
  ShieldCheckIcon,
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
      label: 'Command Overview',
      icon: <DashboardIcon size={17} />,
    },
    {
      id: 'sender',
      label: 'Campus Outreach Dispatcher',
      icon: <SendIcon size={17} />,
    },
    {
      id: 'templates',
      label: 'Proposal Templates',
      icon: <TemplateIcon size={17} />,
    },
    {
      id: 'settings',
      label: 'System & Security Settings',
      icon: <SettingsIcon size={17} />,
      badge: role === 'admin' ? 'Admin' : null,
    },
  ];

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brandArea}>
        <div className={styles.brandRow}>
          <ShortfundlyLogoSymbol size={38} className={styles.logoImg} />
          <div className={styles.brandMeta}>
            <span className={styles.brandTitle}>Shortfundly</span>
            <span className={styles.brandSubtitle}>Campus Outreach</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Section */}
      <div className={styles.navSection}>
        <div className={styles.navLabel}>Outreach Management</div>
        <nav className={styles.navList}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className={styles.itemIcon}>{item.icon}</span>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.badge && <span className={styles.roleTag}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Status & Sign Out Footer */}
      <div className={styles.footerSection}>
        <div className={styles.userProfileCard}>
          <div className={styles.userEmailRow}>
            <div className={styles.userAvatar}>
              <UserIcon size={13} />
            </div>
            <div className={styles.userInfoCol}>
              <span className={styles.userEmailText} title={session?.email || 'User'}>
                {session?.email || 'Authenticated User'}
              </span>
              <div className={styles.roleBadgesRow}>
                <span className={`${styles.rolePill} ${getRoleClass(role)}`}>
                  {getRoleLabel(role)}
                </span>
                <span className={`${styles.sendPill} ${canSend ? styles.sendActive : styles.sendDisabled}`}>
                  {canSend ? 'Dispatch Enabled' : 'View Only'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
          title="Sign out of Shortfundly Outreach Portal"
        >
          <LogOutIcon size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

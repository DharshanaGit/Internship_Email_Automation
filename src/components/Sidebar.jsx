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
  CampaignPulseLogoSymbol,
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
      label: 'Campaign Overview',
      icon: <DashboardIcon size={17} />,
    },
    {
      id: 'sender',
      label: 'Outreach Dispatcher',
      icon: <SendIcon size={17} />,
    },
    {
      id: 'templates',
      label: 'Proposal Templates',
      icon: <TemplateIcon size={17} />,
    },
    {
      id: 'settings',
      label: 'System & Security',
      icon: <SettingsIcon size={17} />,
      badge: role === 'admin' ? 'Admin' : null,
    },
  ];

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brandArea}>
        <div className={styles.brandRow}>
          <div className={styles.logoWrap}>
            <CampaignPulseLogoSymbol size={34} />
          </div>
          <div className={styles.brandMeta}>
            <span className={styles.brandTitle}>ReachOut <span className={styles.brandTeal}>OS</span></span>
            <span className={styles.brandSubtitle}>Campaign Operations</span>
          </div>
        </div>
      </div>

      {/* User Mini Profile Inset */}
      <div className={styles.profileInset}>
        <div className={styles.avatarWrap}>
          <UserIcon size={15} />
        </div>
        <div className={styles.profileMeta}>
          <span className={styles.profileEmail} title={session?.email || 'User'}>
            {session?.email?.split('@')[0] || 'Campaign Ops'}
          </span>
          <div className={styles.profileBadges}>
            <span className={`${styles.rolePill} ${getRoleClass(role)}`}>
              {getRoleLabel(role)}
            </span>
            <span className={`${styles.sendPill} ${canSend ? styles.sendActive : styles.sendDisabled}`}>
              {canSend ? 'Dispatch Ready' : 'View Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className={styles.navSection}>
        <div className={styles.navLabel}>Operations Menu</div>
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

      {/* Sign Out Footer */}
      <div className={styles.footerSection}>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
          title="Sign out of ReachOut OS"
        >
          <LogOutIcon size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

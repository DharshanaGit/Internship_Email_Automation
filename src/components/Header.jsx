'use client';

import React from 'react';
import Image from 'next/image';
import styles from './Header.module.css';
import { ServerIcon, UserIcon, LogOutIcon } from './Icons.jsx';

export default function Header({ user, onOpenSmtpDiagnostics, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brandGroup}>
          <div className={styles.logoWrapper}>
            {/* Shortfundly Official Logo */}
            <img
              src="/sf_logo.png"
              alt="Shortfundly"
              className={styles.logoImg}
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.titleArea}>
            <div className={styles.portalTitle}>
              Shortfundly Campus Outreach Portal
            </div>
            <div className={styles.tagline}>
              Connecting Campuses. Empowering Creators.
            </div>
          </div>
        </div>

        <div className={styles.rightGroup}>
          <div className={styles.statusPill}>
            <span className={styles.statusDot} />
            <span>SQLite Active</span>
          </div>

          <button
            type="button"
            className={styles.smtpBtn}
            onClick={onOpenSmtpDiagnostics}
            title="Inspect Google SMTP status & settings"
          >
            <ServerIcon size={14} />
            <span>Google SMTP</span>
          </button>

          {user && (
            <div className={styles.userBadge}>
              <UserIcon size={14} />
              <span>{user.email}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.logoutBtn}
            onClick={onLogout}
            title="Sign out of outreach portal"
          >
            <LogOutIcon size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

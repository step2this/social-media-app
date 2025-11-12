import styles from './layout.module.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.appLayout}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Social App</h2>
        </div>
        <div className={styles.sidebarNav}>
          <div className={styles.navItem}>🏠 Home</div>
          <div className={styles.navItem}>🔍 Explore</div>
          <div className={styles.navItem}>🔔 Notifications</div>
          <div className={styles.navItem}>💬 Messages</div>
          <div className={styles.navItem}>👤 Profile</div>
          <div className={styles.navItem}>➕ Create</div>
          <div className={styles.navItem}>⚙️ Settings</div>
        </div>
        <div className={styles.sidebarFooter}>
          <div className={styles.navItem}>Phase 1 - Navigation links will be functional in Phase 3</div>
        </div>
      </nav>
      <div className={styles.mainContainer}>
        <header className={styles.appHeader}>
          <div className={styles.headerContent}>
            <h3>Protected Area</h3>
            <div className={styles.userInfo}>
              <span>Auth will be added in Phase 2</span>
            </div>
          </div>
        </header>
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}

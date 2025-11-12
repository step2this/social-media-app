export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: '260px',
        background: '#1e1e1e',
        color: 'white',
        padding: '1rem',
        position: 'fixed',
        height: '100vh',
      }}>
        <h2 style={{ color: '#1976d2' }}>Social App</h2>
        <p style={{ fontSize: '0.75rem', color: '#999' }}>
          Navigation will be functional in Phase 3
        </p>
      </nav>
      <div style={{ marginLeft: '260px', flex: 1 }}>
        <header style={{
          background: 'white',
          borderBottom: '1px solid #e0e0e0',
          padding: '1rem 2rem',
        }}>
          <h3>Protected Area</h3>
        </header>
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

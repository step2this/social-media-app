import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Redirect to login if not authenticated (extra protection layer)
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-container">
        <Header user={session} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

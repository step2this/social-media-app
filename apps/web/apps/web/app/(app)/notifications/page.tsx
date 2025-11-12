import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
};

export default function NotificationsPage() {
  return (
    <div>
      <h1>Notifications</h1>
      <p style={{background:"#e3f2fd",padding:"1rem",borderRadius:"8px",color:"#1976d2"}}>Notifications will be loaded in Phase 4.</p>
    </div>
  );
}

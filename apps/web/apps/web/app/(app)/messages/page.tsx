import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
};

export default function MessagesPage() {
  return (
    <div>
      <h1>Messages</h1>
      <p style={{background:"#e3f2fd",padding:"1rem",borderRadius:"8px",color:"#1976d2"}}>Direct messaging will be added in a future phase.</p>
    </div>
  );
}

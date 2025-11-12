import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore',
};

export default function ExplorePage() {
  return (
    <div>
      <h1>Explore</h1>
      <p style={{background:"#e3f2fd",padding:"1rem",borderRadius:"8px",color:"#1976d2"}}>Trending content will be loaded in Phase 4.</p>
    </div>
  );
}

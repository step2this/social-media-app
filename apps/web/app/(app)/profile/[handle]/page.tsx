import { Metadata } from 'next';

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  return (
    <div>
      <h1>Profile: @{handle}</h1>
      <p style={{background:'#e3f2fd',padding:'1rem',borderRadius:'8px',color:'#1976d2'}}>
        Profile data will be loaded in Phase 4.
      </p>
    </div>
  );
}

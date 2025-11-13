import { Metadata } from 'next';

type Props = {
  params: Promise<{ postId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  return {
    title: `Post ${postId}`,
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  return (
    <div>
      <h1>Post {postId}</h1>
      <p style={{background:'#e3f2fd',padding:'1rem',borderRadius:'8px',color:'#1976d2'}}>
        Post details will be loaded in Phase 4.
      </p>
    </div>
  );
}

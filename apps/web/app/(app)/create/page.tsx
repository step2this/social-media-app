import { Metadata } from 'next';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Create Post',
};

export default function CreatePostPage() {
  logger.info('Create post page accessed');

  return (
    <div>
      <h1>Create Post</h1>
      <p style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', color: '#1976d2' }}>
        Form will be implemented in Phase 3.
      </p>
    </div>
  );
}

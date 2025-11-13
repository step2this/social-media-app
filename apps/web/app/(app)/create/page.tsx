import { Metadata } from 'next';
import { CreatePostForm } from '@/components/posts/CreatePostForm';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Create Post',
};

export default function CreatePostPage() {
  logger.info('Create post page accessed');

  return (
    <div>
      <h1 className="page-title">Create Post</h1>
      <CreatePostForm />
    </div>
  );
}

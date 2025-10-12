# Route Architecture Documentation

**Last Updated**: October 12, 2025
**Version**: 2.0.0
**Status**: Production-Ready Reference

---

## 🚨 Critical Understanding: The Dual Naming Convention

This application uses **TWO DIFFERENT** route naming conventions by design. Understanding this distinction is **CRITICAL** to prevent 404 errors in production.

### The Two Conventions

| Type | Convention | Example | Used For | Why |
|------|------------|---------|----------|-----|
| **Backend API Routes** | PLURAL | `/posts/:postId` | HTTP API endpoints | RESTful standards require plural resource names |
| **React Router URLs** | SINGULAR | `/post/:postId` | User-facing URLs | Clean, intuitive URLs for users |

### Why This Exists

1. **Backend follows REST standards**: RESTful APIs conventionally use plural resource names (`/posts`, `/users`, `/comments`)
2. **Frontend prioritizes UX**: User-facing URLs are cleaner with singular forms (`/post/123` reads better than `/posts/123`)
3. **Separation of concerns**: API structure is independent of URL structure

### ⚠️ Critical Rule

**NEVER** mix these conventions:
- ✅ **Frontend API calls** → Use backend routes (PLURAL): `apiClient.get('/posts/123')`
- ✅ **Frontend navigation** → Use React Router (SINGULAR): `navigate('/post/123')`
- ❌ **WRONG**: `apiClient.get('/post/123')` → Results in 404
- ❌ **WRONG**: `navigate('/posts/123')` → Results in 404

---

## 📚 Complete API Reference

### Authentication Routes (6 endpoints)

| Method | Path | Purpose | Request Body | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `POST` | `/auth/register` | Register new user | `{email, password, handle, displayName}` | `{user, accessToken, refreshToken}` | No |
| `POST` | `/auth/login` | User login | `{email, password}` | `{user, accessToken, refreshToken}` | No |
| `POST` | `/auth/refresh` | Refresh access token | `{refreshToken}` | `{accessToken, refreshToken}` | No |
| `POST` | `/auth/logout` | User logout | `{refreshToken}` | `{success}` | Yes |
| `GET` | `/auth/profile` | Get current user profile | - | `{user}` | Yes |
| `PUT` | `/auth/profile` | Update auth profile | `{displayName, bio, avatar}` | `{user}` | Yes |

### Profile Routes (4 endpoints)

| Method | Path | Purpose | Request Body | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `GET` | `/profile/me` | Get current user's full profile | - | `{profile, stats}` | Yes |
| `GET` | `/profile/:handle` | Get user profile by handle | - | `{profile, stats}` | Optional |
| `PUT` | `/profile` | Update current user's profile | `{displayName, bio, avatar}` | `{profile}` | Yes |
| `POST` | `/profile/upload-url` | Get presigned URL for image upload | `{fileType, purpose}` | `{uploadUrl, publicUrl}` | Yes |

### Posts Routes (6 endpoints)

| Method | Path | Purpose | Request Body | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `POST` | `/posts` | Create new post | `{content, fileType}` | `{post, uploadUrl}` | Yes |
| `GET` | `/posts/:postId` | Get single post by ID | - | `{post}` | Optional |
| `GET` | `/posts/my` | Get current user's posts | - | `{posts, cursor}` | Yes |
| `GET` | `/profile/:handle/posts` | Get user's posts by handle | - | `{posts, cursor}` | Optional |
| `PUT` | `/posts/:postId` | Update post | `{content}` | `{post}` | Yes |
| `DELETE` | `/posts/:postId` | Delete post | - | `{success}` | Yes |

### Feed Routes (2 endpoints)

| Method | Path | Purpose | Query Params | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `GET` | `/feed` | Get public feed | `?limit=20&cursor=xxx` | `{posts, cursor}` | Optional |
| `GET` | `/feed/following` | Get following feed | `?limit=20&cursor=xxx` | `{posts, cursor}` | Yes |

### Likes Routes (3 endpoints)

| Method | Path | Purpose | Request Body | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `POST` | `/likes` | Like a post | `{postId}` | `{success}` | Yes |
| `DELETE` | `/likes` | Unlike a post | `{postId}` | `{success}` | Yes |
| `GET` | `/likes/:postId` | Get like status for post | - | `{isLiked, count}` | Optional |

### Follows Routes (3 endpoints)

| Method | Path | Purpose | Request Body | Response | Auth Required |
|--------|------|---------|--------------|----------|---------------|
| `POST` | `/follows` | Follow user | `{userId}` | `{success}` | Yes |
| `DELETE` | `/follows` | Unfollow user | `{userId}` | `{success}` | Yes |
| `GET` | `/follows/:userId/status` | Get follow status | - | `{isFollowing}` | Yes |

### Comments Routes (3 endpoints)

| Method | Path | Purpose | Request Body/Query | Response | Auth Required |
|--------|------|---------|-------------------|----------|---------------|
| `POST` | `/comments` | Create comment | Body: `{postId, content}` | `{comment}` | Yes |
| `GET` | `/comments` | Get comments | Query: `?postId=xxx&limit=20&cursor=xxx` | `{comments, cursor}` | Optional |
| `DELETE` | `/comments` | Delete comment | Body: `{commentId}` | `{success}` | Yes |

### Notifications Routes (5 endpoints)

| Method | Path | Purpose | Request Body/Params | Response | Auth Required |
|--------|------|---------|---------------------|----------|---------------|
| `GET` | `/notifications` | Get paginated notifications list | Query: `limit`, `cursor`, `filter` | `{items, totalCount, hasMore, nextCursor}` | Yes |
| `GET` | `/notifications/unread-count` | Get count of unread notifications | - | `{count}` | Yes |
| `PUT` | `/notifications/:notificationId/read` | Mark notification as read | Path: `notificationId` | `{notification}` | Yes |
| `PUT` | `/notifications/mark-all-read` | Mark all notifications as read | - | `{count}` | Yes |
| `DELETE` | `/notifications/:notificationId` | Delete a notification | Path: `notificationId` | `{success, message}` | Yes |

**Query Parameters for GET /notifications**:
- `limit`: Number of notifications to return (default: 20, max: 100)
- `cursor`: Pagination cursor for next page (optional)
- `filter`: Filter by status - `'unread'` to get only unread notifications (optional)

**Notification Types**:
- `like` - User liked your post
- `comment` - User commented on your post
- `follow` - User started following you
- `mention` - User mentioned you in a comment

**Notification Response Structure**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "like" | "comment" | "follow" | "mention",
  "status": "unread" | "read",
  "title": "Notification title",
  "message": "Notification message",
  "actor": {
    "userId": "uuid",
    "handle": "username",
    "displayName": "Display Name",
    "avatarUrl": "https://..."
  },
  "target": {
    "type": "post" | "comment" | "user",
    "id": "uuid",
    "url": "/post/123",
    "preview": "Preview text..."
  },
  "createdAt": "2025-10-12T10:30:00Z",
  "updatedAt": "2025-10-12T10:30:00Z"
}
```

### Utility Routes (2 endpoints)

| Method | Path | Purpose | Response | Auth Required |
|--------|------|---------|----------|---------------|
| `GET` | `/health` | Health check | `{status, environment}` | No |
| `GET` | `/hello` | Test endpoint | `{message}` | No |

---

## 🌐 React Router Configuration

### User-Facing Routes (Frontend URLs)

These are the routes users see in their browser's address bar:

| Path | Component | Purpose | Auth Required |
|------|-----------|---------|---------------|
| `/` | `HomePage` | Main feed/home page | Yes |
| `/post/:postId` | `PostDetailPage` | View single post (SINGULAR) | Yes |
| `/profile` | `MyProfilePage` | Current user's profile | Yes |
| `/profile/:handle` | `ProfilePage` | View user profile by handle | No |
| `/notifications` | `NotificationsPage` | View notifications list | Yes |
| `/explore` | `ExplorePage` | Explore/discover content | Yes |
| `/create` | `CreatePostPage` | Create new post | Yes |
| `/messages` | `PlaceholderPage` | Messages (coming soon) | Yes |
| `/settings` | `PlaceholderPage` | Settings (coming soon) | Yes |
| `/design-test` | `DesignSystemTest` | Design system test page | Yes |
| `/login` | Redirect | Legacy login route | No |

### ⚠️ Important: Singular vs Plural

- **React Router**: `/post/:postId` (SINGULAR) - What users see
- **API Endpoint**: `/posts/:postId` (PLURAL) - What the code calls
- These are **INTENTIONALLY DIFFERENT** - do not "fix" this!

---

## 👨‍💻 Developer Guidelines

### Adding New Routes: Step-by-Step Checklist

When adding a new route, follow this checklist to avoid 404 errors:

#### 1. Backend API Route
```javascript
// ✅ In packages/backend/server.js
app.get('/posts/:postId', (req, res) => callHandler('postsGetPost', req, res));
//       ^^^^^^ PLURAL for API routes
```

#### 2. Backend Handler
```javascript
// ✅ In packages/backend/src/handlers/posts/get-post.ts
export const handler = async (event) => {
  // Handler implementation
};
```

#### 3. Frontend Service Layer
```javascript
// ✅ In packages/frontend/src/services/postService.ts
async getPost(postId: string): Promise<Post> {
  const response = await apiClient.get<PostResponse>(`/posts/${postId}`);
  //                                                   ^^^^^^ PLURAL for API calls
  return response.post;
}
```

#### 4. React Router Configuration
```jsx
// ✅ In packages/frontend/src/App.tsx
<Route path="/post/:postId" element={<PostDetailPage />} />
{/*           ^^^^ SINGULAR for user-facing URLs */}
```

#### 5. Component Navigation
```jsx
// ✅ In React components
const navigate = useNavigate();
navigate(`/post/${postId}`);  // SINGULAR for navigation
//        ^^^^
```

### Common Pitfalls to Avoid

#### ❌ Pitfall 1: Using Wrong Convention in API Calls
```javascript
// ❌ WRONG - Will cause 404
const response = await apiClient.get(`/post/${postId}`);

// ✅ CORRECT
const response = await apiClient.get(`/posts/${postId}`);
```

#### ❌ Pitfall 2: Using Wrong Convention in Navigation
```jsx
// ❌ WRONG - Will cause 404
navigate(`/posts/${postId}`);

// ✅ CORRECT
navigate(`/post/${postId}`);
```

#### ❌ Pitfall 3: Hardcoding API URLs
```javascript
// ❌ WRONG - Bypasses service layer
fetch(`http://localhost:3001/post/${postId}`);

// ✅ CORRECT - Use service layer
postService.getPost(postId);
```

#### ❌ Pitfall 4: Mixing Route Handlers
```javascript
// ❌ WRONG - Missing handler mapping in server.js
app.get('/posts/my', (req, res) => callHandler('postsGetUserPosts', req, res));

// ✅ CORRECT - Separate handler for each route
app.get('/posts/my', (req, res) => callHandler('postsGetMyPosts', req, res));
```

### Adding Notification Features

**When to create notifications**:
1. User interactions (likes, comments, follows)
2. Mentions in comments or posts
3. System events (achievements, announcements)

**Creating notifications from Lambda handlers**:
```typescript
// In your handler (e.g., like-post.ts)
import { notificationService } from '@social-media-app/dal';

await notificationService.createNotification({
  userId: postOwnerId,              // Who receives the notification
  type: 'like',                     // Notification type
  title: 'New like',
  message: `${likerHandle} liked your post`,
  actor: {                          // Who triggered the notification
    userId: likerId,
    handle: likerHandle,
    displayName: likerName
  },
  target: {                         // What was interacted with
    type: 'post',
    id: postId,
    url: `/post/${postId}`
  }
});
```

**Consuming notifications in frontend**:
```typescript
import { notificationService } from '../services/notificationService';

// Get notifications
const { items, nextCursor } = await notificationService.getNotifications(20);

// Get unread count for badge
const { count } = await notificationService.getUnreadCount();

// Mark as read when user clicks
await notificationService.markAsRead(notificationId);

// Mark all as read
await notificationService.markAllAsRead();

// Delete notification
await notificationService.deleteNotification(notificationId);
```

**Real-time updates**:
- Current: Polling every 30 seconds
- Future: WebSocket for instant updates

### Testing Guidelines

#### 1. Unit Test Routes
```javascript
// Test that routes resolve correctly
describe('Post Routes', () => {
  it('should fetch post from /posts/:postId', async () => {
    const response = await apiClient.get('/posts/123');
    expect(response.status).toBe(200);
  });
});
```

#### 2. Integration Test Navigation
```javascript
// Test that navigation works
it('should navigate to /post/:postId', () => {
  const { getByRole } = render(<PostCard postId="123" />);
  fireEvent.click(getByRole('link'));
  expect(window.location.pathname).toBe('/post/123');
});
```

#### 3. Manual Testing Checklist
- [ ] Start dev server: `pnpm dev`
- [ ] Check console for route logs
- [ ] Test API endpoint directly: `curl http://localhost:3001/posts/123`
- [ ] Test navigation in browser
- [ ] Check Network tab for correct API calls

---

## 🧭 Navigation Patterns

### Pattern 1: API Service Calls

**Always use the service layer for API calls:**

```javascript
// ✅ CORRECT - Service layer abstracts API details
import { postService } from './services/postService';

const post = await postService.getPost(postId);
```

**Never hardcode API calls:**

```javascript
// ❌ WRONG - Hardcoded API call
const response = await fetch(`http://localhost:3001/posts/${postId}`);
```

### Pattern 2: User Navigation

**Use React Router hooks for navigation:**

```jsx
// ✅ CORRECT - Using useNavigate hook
import { useNavigate } from 'react-router-dom';

function PostCard({ postId }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/post/${postId}`);  // SINGULAR
  };
}
```

**Or use Link components:**

```jsx
// ✅ CORRECT - Using Link component
import { Link } from 'react-router-dom';

<Link to={`/post/${postId}`}>View Post</Link>
```

### Pattern 3: Programmatic Navigation

```javascript
// ✅ CORRECT - Service-based navigation
import { navigationService } from './services/navigationService';

navigationService.navigateToPost(postId);
// Internally uses: navigate(`/post/${postId}`)
```

### Pattern 4: Navigating from Notifications

```typescript
// NotificationsPage.tsx - Handle notification click
const handleNotificationClick = async (notification: Notification) => {
  // Mark as read
  if (notification.status === 'unread') {
    await notificationService.markAsRead(notification.id);
  }

  // Navigate to target (React Router singular convention)
  if (notification.target?.url) {
    navigate(notification.target.url); // e.g., "/post/123"
  }
};
```

---

## 🔄 Route Resolution Flow

### Example: User Views a Post

```mermaid
graph LR
    A[User clicks post] --> B[React Router]
    B --> C["/post/123" SINGULAR]
    C --> D[PostDetailPage Component]
    D --> E[postService.getPost]
    E --> F[API Call: "/posts/123" PLURAL]
    F --> G[Backend Handler]
    G --> H[Database Query]
    H --> I[Return Post Data]
    I --> J[Render Post]
```

### Step-by-Step Resolution

1. **User Action**: User clicks on a post card
2. **Navigation**: React Router navigates to `/post/123` (SINGULAR)
3. **Component Mount**: `PostDetailPage` component mounts
4. **Data Fetch**: Component calls `postService.getPost('123')`
5. **API Call**: Service makes HTTP request to `/posts/123` (PLURAL)
6. **Backend Processing**: Express routes to handler via `/posts/:postId`
7. **Data Return**: Handler fetches from DynamoDB and returns
8. **Component Update**: Component receives data and renders

---

## 🔧 Troubleshooting

### Common 404 Errors and Solutions

#### Error: "Cannot GET /post/123"
**Cause**: Frontend trying to make API call with singular form
**Solution**: Use `postService.getPost()` instead of direct API call

#### Error: "Route not found /posts/123" in browser
**Cause**: Using plural form in React Router navigation
**Solution**: Use `navigate('/post/123')` with singular form

#### Error: "404 Not Found" in Network tab
**Cause**: API endpoint doesn't exist or wrong convention
**Solution**: Check server.js for route registration

### Debugging Tools

#### 1. Server Console Logs
```bash
# Backend logs show all incoming requests
📥 GET /posts/123      # Correct API call
📥 GET /post/123       # Wrong - would cause 404
```

#### 2. React DevTools
- Check Router context for current route
- Verify route params are passed correctly

#### 3. Network Tab
- Verify API calls use correct endpoints
- Check request/response headers
- Confirm status codes

#### 4. Route Testing Script
```bash
# Test API routes directly
curl http://localhost:3001/posts/123        # Should work
curl http://localhost:3001/post/123         # Should 404

# Test frontend routes
open http://localhost:3000/post/123         # Should work
open http://localhost:3000/posts/123        # Should 404
```

#### Notification Badge Not Updating
**Problem**: Unread badge shows 0 or stale count

**Causes**:
1. NotificationService not fetching unread count
2. Polling interval not running
3. User not authenticated

**Solution**:
```typescript
// Check if polling is working
useEffect(() => {
  console.log('Fetching unread count...');
  const fetchCount = async () => {
    const { count } = await notificationService.getUnreadCount();
    console.log('Unread count:', count);
  };
  fetchCount();
}, []);
```

**Debug Tools**:
- Check Network tab for `/notifications/unread-count` calls
- Verify authentication token is present
- Check console for fetch errors

#### Notifications Not Appearing
**Problem**: New notifications don't show in list

**Causes**:
1. Notification not created in backend
2. DynamoDB stream processor not running
3. Notification service error

**Solution**:
- Check backend logs for notification creation
- Verify stream processor is running (LocalStack mode)
- Check `/notifications` API response in Network tab

### Quick Diagnosis Flowchart

```
Is it a 404 error?
├─ Yes
│  ├─ In browser URL bar?
│  │  └─ Check React Router config (should be SINGULAR)
│  └─ In Network tab?
│     └─ Check API call (should be PLURAL)
└─ No
   └─ Check authentication, permissions, or server errors
```

---

## 📋 Route Audit History

### Recent Fixes (October 2025)

The following route mismatches were identified and fixed:

1. **API call mismatch**: Frontend using `/post/` instead of `/posts/`
2. **Navigation mismatch**: PostCard using `/posts/` instead of `/post/`
3. **Missing route**: Backend missing `/posts/my` endpoint
4. **Documentation mismatch**: Console logs showing incorrect routes

All issues have been resolved and tests are passing.

---

## 🎯 Quick Reference Card

### For Frontend Developers

```javascript
// Making API calls (PLURAL)
await postService.getPost(id)           // → GET /posts/:id
await postService.createPost(data)      // → POST /posts
await postService.getUserPosts(handle)  // → GET /profile/:handle/posts
await notificationService.getNotifications(20) // → GET /notifications

// Navigation (SINGULAR)
navigate('/post/123')                    // View post
navigate('/profile/alice')              // View profile
navigate('/notifications')               // View notifications
<Link to="/post/123">View</Link>        // Link to post
```

### For Backend Developers

```javascript
// Route registration (PLURAL)
app.get('/posts/:postId', handler)      // Get post
app.post('/posts', handler)             // Create post
app.get('/profile/:handle/posts', handler) // Get user posts
app.get('/notifications', handler)      // Get notifications

// Handler mapping
postsGetPost                    → GET /posts/:postId
postsCreatePost                 → POST /posts
postsGetUserPosts               → GET /profile/:handle/posts
notificationsGetNotifications   → GET /notifications
notificationsMarkAsRead         → PUT /notifications/:notificationId/read
```

---

## 📚 Additional Resources

- [REST API Design Guidelines](https://restfulapi.net/resource-naming/)
- [React Router Documentation](https://reactrouter.com/)
- [Express Routing Guide](https://expressjs.com/en/guide/routing.html)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Oct 12, 2025 | Complete rewrite after route audit |
| 1.0.0 | Sep 2025 | Initial documentation |

---

**Remember**: The dual naming convention is **intentional** and **critical**. When in doubt:
- **API calls**: Use PLURAL (`/posts`, `/comments`, `/likes`)
- **User URLs**: Use SINGULAR (`/post`, `/profile`, `/create`)
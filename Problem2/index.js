const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 9876;

// Configuration with access token
const API_CONFIG = {
  baseUrl: 'http://20.244.56.144/evaluation-service',
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjA4MDQxLCJpYXQiOjE3NDM2MDc3NDEsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjcwNTY0NWE2LTIyOGQtNDMyNC04NTgxLTVlNmZhYzYxYzJiYyIsInN1YiI6ImNsb3VkYW51cmFnMTFAZ21haWwuY29tIn0sImVtYWlsIjoiY2xvdWRhbnVyYWcxMUBnbWFpbC5jb20iLCJuYW1lIjoiYW51cmFnIHJhaiIsInJvbGxObyI6IjIyMDUyOTY4IiwiYWNjZXNzQ29kZSI6Im53cHdyWiIsImNsaWVudElEIjoiNzA1NjQ1YTYtMjI4ZC00MzI0LTg1ODEtNWU2ZmFjNjFjMmJjIiwiY2xpZW50U2VjcmV0IjoicHZGcmNyQ3ZxR3BVa1dLcSJ9.6Rljwsw8N7B1Y_Mr-dExv9uOjNQft9KX--Krt01P_xY",
  timeout: 500,
  maxRetries: 2
};

// Data cache
const cache = {
  users: {},
  posts: {},
  comments: {},
  userPostCounts: {},
  postCommentCounts: {},
  lastUpdated: null
};

// Helper function to make authenticated requests
async function fetchWithAuth(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${API_CONFIG.accessToken}`
      },
      timeout: API_CONFIG.timeout
    });
    return response.data;
  } catch (error) {
    console.error(`Request failed for ${url}:`, error.message);
    return null;
  }
}

// Fetch all users
async function fetchUsers() {
  const url = `${API_CONFIG.baseUrl}/users`;
  const data = await fetchWithAuth(url);
  return data?.users || {};
}

// Fetch posts for a specific user
async function fetchUserPosts(userId) {
  const url = `${API_CONFIG.baseUrl}/users/${userId}/posts`;
  const data = await fetchWithAuth(url);
  return data?.posts || [];
}

// Fetch comments for a specific post
async function fetchPostComments(postId) {
  const url = `${API_CONFIG.baseUrl}/posts/${postId}/comments`;
  const data = await fetchWithAuth(url);
  return data?.comments || [];
}

// Update cache with all data
async function updateCache() {
  try {
    // 1. Fetch all users
    cache.users = await fetchUsers();
    
    // 2. Fetch posts for each user
    cache.userPostCounts = {};
    cache.posts = {};
    for (const userId in cache.users) {
      const posts = await fetchUserPosts(userId);
      cache.posts[userId] = posts;
      cache.userPostCounts[userId] = posts.length;
    }
    
    // 3. Fetch comments for each post
    cache.postCommentCounts = {};
    for (const userId in cache.posts) {
      for (const post of cache.posts[userId]) {
        const comments = await fetchPostComments(post.id);
        cache.postCommentCounts[post.id] = comments.length;
      }
    }
    
    cache.lastUpdated = new Date();
    console.log('Cache updated at:', cache.lastUpdated);
  } catch (error) {
    console.error('Cache update failed:', error);
  }
}

// Get top 5 users by post count
app.get('/users', async (req, res) => {
  try {
    if (Object.keys(cache.users).length === 0) {
      await updateCache();
    }
    
    const topUsers = Object.entries(cache.userPostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({
        userId,
        username: cache.users[userId],
        postCount: count
      }));
    
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get popular or latest posts
app.get('/posts', async (req, res) => {
  try {
    const type = req.query.type;
    
    if (Object.keys(cache.posts).length === 0) {
      await updateCache();
    }
    
    if (type === 'popular') {
      // Find posts with max comments
      let maxComments = 0;
      const popularPosts = [];
      
      for (const userId in cache.posts) {
        for (const post of cache.posts[userId]) {
          const commentCount = cache.postCommentCounts[post.id] || 0;
          if (commentCount > maxComments) {
            maxComments = commentCount;
            popularPosts.length = 0;
            popularPosts.push(post);
          } else if (commentCount === maxComments) {
            popularPosts.push(post);
          }
        }
      }
      
      res.json(popularPosts);
    } else if (type === 'latest') {
      // Get all posts and sort by ID (assuming higher IDs are newer)
      const allPosts = Object.values(cache.posts).flat();
      const latestPosts = allPosts
        .sort((a, b) => b.id - a.id)
        .slice(0, 5);
      
      res.json(latestPosts);
    } else {
      res.status(400).json({ error: 'Invalid type parameter' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize server
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await updateCache();
});

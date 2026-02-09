const baseURL = window.__API_URL__ || 'https://vercel.com/praveenkoppal819-gmailcoms-projects/social-media-app';
const tokenKey = 'sm_auth_token';

let currentUser = null;
let userLikes = new Set();

// API helper
async function apiFetch(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(tokenKey);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(baseURL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Unauthorized: clear token and show auth modal so user can re-authenticate
    localStorage.removeItem(tokenKey);
    try { show($('#auth-modal')); hide($('#app')); } catch (e) {}
    throw { status: 401, body: json };
  }
  if (!res.ok) throw { status: res.status, body: json };
  return json;
}

// DOM helpers
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// Auth Modal
function closeAuthModal() {
  hide($('#auth-modal'));
}

function switchToLogin() {
  hide($('#register-form'));
  show($('#login-form'));
}

function switchToRegister() {
  hide($('#login-form'));
  show($('#register-form'));
}

// View Management
function showView(viewName) {
  $$('.view').forEach(v => hide(v));
  const view = $(`#${viewName}-view`);
  if (view) show(view);
  
  $$('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (viewName === 'feed') {
    $('#btn-nav-feed')?.classList.add('active');
  } else if (viewName === 'profile') {
    $('#btn-nav-profile')?.classList.add('active');
  } else if (viewName === 'followers') {
    $('#btn-nav-followers')?.classList.add('active');
  } else if (viewName === 'following') {
    $('#btn-nav-following')?.classList.add('active');
  } else if (viewName === 'suggestions') {
    $('#btn-nav-suggestions')?.classList.add('active');
  }
}

function showFeed() {
  showView('feed');
  loadFeed();
}

function showProfile() {
  showView('profile');
  loadProfile();
}

function showFollowers() {
  showView('followers');
  loadFollowers();
}

function showFollowing() {
  showView('following');
  loadFollowing();
}

function showSuggestions() {
  showView('suggestions');
  loadSuggestions();
}

// Auth Handlers
async function handleLogin() {
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value.trim();
  if (!email || !password) {
    alert('Please fill all fields');
    return;
  }
  try {
    const res = await apiFetch('POST', '/api/auth/login', { email, password });
    localStorage.setItem(tokenKey, res.token);
    await initApp();
    closeAuthModal();
  } catch (err) {
    const msg = err?.body?.error || err?.body?.message || err?.body || 'Invalid credentials';
    if (Array.isArray(msg)) alert('Login failed: ' + msg.join('; '));
    else alert('Login failed: ' + msg);
  }
}

async function handleRegister() {
  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim();
  const password = $('#reg-password').value.trim();
  if (!name || !email || !password) {
    alert('Please fill all fields');
    return;
  }
  try {
    const full_name = name;
    const username = name.toLowerCase().replace(/\s+/g, '');
    await apiFetch('POST', '/api/auth/register', { username, email, password, full_name });
    alert('Registration successful! Please log in.');
    switchToLogin();
    $('#login-email').value = email;
  } catch (err) {
    const msg = err?.body?.error || err?.body?.message || err?.body || 'Error registering';
    if (Array.isArray(msg)) alert('Registration failed: ' + msg.join('; '));
    else alert('Registration failed: ' + msg);
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem(tokenKey);
    currentUser = null;
    userLikes.clear();
    show($('#auth-modal'));
    hide($('#app'));
    $('#login-email').value = '';
    $('#login-password').value = '';
    $('#reg-name').value = '';
    $('#reg-email').value = '';
    $('#reg-password').value = '';
  }
}

// Load User Profile
async function loadProfile() {
  if (!currentUser) return;
  try {
    const user = currentUser;
    
    $('#profile-name').textContent = user.full_name || user.username;
    $('#profile-email').textContent = user.email;
    $('#profile-avatar-initial').textContent = (user.full_name || user.username)[0]?.toUpperCase() || 'U';
    
    // Load stats
    try {
      const statsRes = await apiFetch('GET', '/api/users/stats');
      // Backend returns: {followingCount, followersCount}
      $('#profile-follower-count').textContent = statsRes.followersCount || statsRes.followers || 0;
      $('#profile-following-count').textContent = statsRes.followingCount || statsRes.following || 0;
    } catch (e) {
      console.warn('Could not load stats:', e);
    }
    
    // Load user's posts
    try {
      const postsRes = await apiFetch('GET', '/api/posts/my');
      const posts = postsRes.posts || [];
      // Set post count
      $('#profile-post-count').textContent = posts.length;
      renderProfilePosts(posts);
    } catch (e) {
      console.warn('Could not load user posts:', e);
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

function renderProfilePosts(posts) {
  const container = $('#profile-posts-list');
  container.innerHTML = '';
  if (!posts.length) {
    container.textContent = 'No posts yet';
    return;
  }
  posts.forEach(post => {
    const el = document.createElement('div');
    el.className = 'post-card-compact';
    el.textContent = post.content?.substring(0, 30) + '...';
    container.appendChild(el);
  });
}

// Load Feed
async function loadFeed() {
  try {
    const res = await apiFetch('GET', '/api/posts/feed');
    renderFeed(res.posts || []);
  } catch (err) {
    console.error('Failed to load feed:', err);
    $('#posts-list').textContent = 'Failed to load posts';
  }
}

function renderFeed(posts) {
  const container = $('#posts-list');
  container.innerHTML = '';
  
  if (!posts.length) {
    container.innerHTML = '<p class="loading">No posts available. Follow some users to see their posts!</p>';
    return;
  }
  
  posts.forEach(post => {
    const template = $('#post-template');
    const node = template.content.cloneNode(true);
    const article = node.querySelector('.post');
    
    // Set data attributes
    article.dataset.postId = post.id;
    article.dataset.authorId = post.user_id;
    
    // Author info
    const authorInitial = (post.full_name || post.username || 'U')[0]?.toUpperCase() || 'U';
    $('.post-avatar', article).textContent = authorInitial;
    $('.post-author-name', article).textContent = post.full_name || post.username || 'Unknown';
    
    // Timestamp
    const date = new Date(post.created_at || post.createdAt);
    const now = new Date();
    const diff = now - date;
    let timeStr = 'just now';
    if (diff > 86400000) timeStr = Math.floor(diff / 86400000) + 'd ago';
    else if (diff > 3600000) timeStr = Math.floor(diff / 3600000) + 'h ago';
    else if (diff > 60000) timeStr = Math.floor(diff / 60000) + 'm ago';
    $('.post-time', article).textContent = timeStr;
    
    // Content
    $('.post-content', article).textContent = post.content;
    
    // Stats - fetch counts from backend (not included in feed response)
    const likesCountEl = $('.likes-count', article);
    const commentsCountEl = $('.comments-count', article);
    likesCountEl.textContent = '0 likes';
    commentsCountEl.textContent = '0 comments';
    
    // Fetch actual counts
    apiFetch('GET', `/api/likes/post/${post.id}`)
      .then(res => {
        const count = res.likesCount || res.count || (Array.isArray(res.likes) ? res.likes.length : 0);
        likesCountEl.textContent = count + ' like' + (count !== 1 ? 's' : '');
      })
      .catch(() => {});
    
    apiFetch('GET', `/api/comments/post/${post.id}`)
      .then(res => {
        const count = res.count || (Array.isArray(res.comments || res) ? (res.comments || res).length : 0);
        commentsCountEl.textContent = count + ' comment' + (count !== 1 ? 's' : '');
      })
      .catch(() => {});
    
    // Like button
    const likeBtn = article.querySelector('.like-btn');
    const isLiked = userLikes.has(post.id);
    if (isLiked) likeBtn.classList.add('liked');
    likeBtn.addEventListener('click', () => handleLike(post.id, likeBtn, post));
    
    // Comment button
    const commentBtn = article.querySelector('.comment-btn');
    const commentsSection = article.querySelector('.post-comments');
    commentBtn.addEventListener('click', () => {
      commentsSection.classList.toggle('hidden');
      if (!commentsSection.classList.contains('hidden')) {
        loadComments(post.id, article);
      }
    });
    
    // Comment input
    const commentInput = article.querySelector('.comment-input');
    const addCommentBtn = article.querySelector('.btn-add-comment');
    addCommentBtn.addEventListener('click', () => handleAddComment(post.id, commentInput, article));
    commentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddComment(post.id, commentInput, article);
    });
    
    container.appendChild(node);
  });
}

async function handleLike(postId, btn, post) {
  try {
    if (userLikes.has(postId)) {
      // Unlike
      await apiFetch('DELETE', `/api/likes/${postId}`);
      userLikes.delete(postId);
      btn.classList.remove('liked');
    } else {
      // Like - use post_id not postId
      await apiFetch('POST', '/api/likes', { post_id: postId });
      userLikes.add(postId);
      btn.classList.add('liked');
    }
    // Reload feed to get updated counts
    await loadFeed();
  } catch (err) {
    console.error('Like action failed:', err);
  }
}

async function loadComments(postId, postElement) {
  try {
    const res = await apiFetch('GET', `/api/comments/post/${postId}`);
    const commentsList = postElement.querySelector('.comments-list');
    commentsList.innerHTML = '';
    
    const comments = res.comments || res || [];
    comments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `<strong>${comment.author?.full_name || comment.author?.username || 'User'}</strong> ${comment.content}`;
      commentsList.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to load comments:', err);
  }
}

async function handleAddComment(postId, inputElement, postElement) {
  const content = inputElement.value.trim();
  if (!content) return;
  
  try {
    // Use post_id not postId to match backend validation schema
    await apiFetch('POST', '/api/comments', { post_id: postId, content });
    inputElement.value = '';
    await loadComments(postId, postElement);
  } catch (err) {
    alert('Failed to add comment');
  }
}

// Load Followers
async function loadFollowers() {
  try {
    const res = await apiFetch('GET', '/api/users/followers');
    const followers = res.followers || res.users || res || [];
    renderUsers(followers, $('#followers-list'));
  } catch (err) {
    console.error('Failed to load followers:', err);
    $('#followers-list').textContent = 'Failed to load followers';
  }
}

// Load Following
async function loadFollowing() {
  try {
    const res = await apiFetch('GET', '/api/users/following');
    const following = res.following || res.users || res || [];
    renderFollowingUsers(following, $('#following-list'));
  } catch (err) {
    console.error('Failed to load following:', err);
    $('#following-list').textContent = 'Failed to load following';
  }
}

// Load Suggestions
async function loadSuggestions() {
  try {
    // Try to get users who haven't been followed yet using search
    const searchRes = await apiFetch('POST', '/api/users/search', { query: '' });
    const users = searchRes.users || searchRes || [];
    renderUsers(users.slice(0, 10), $('#suggestions-list'));
    renderSuggestionsWidget(users.slice(0, 5));
  } catch (err) {
    console.error('Failed to load suggestions:', err);
    // Fallback: just show empty
    $('#suggestions-list').innerHTML = '<p class="loading">No suggestions available</p>';
    $('#widget-suggestions').innerHTML = '<p class="loading">No suggestions</p>';
  }
}

function renderUsers(users, container) {
  container.innerHTML = '';
  if (!users.length) {
    container.textContent = 'No users available';
    return;
  }
  
  users.forEach(user => {
    const template = $('#user-template');
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.user-card');
    
    const initial = (user.full_name || user.username || 'U')[0]?.toUpperCase() || 'U';
    $('.user-avatar', card).textContent = initial;
    $('.user-name', card).textContent = user.full_name || user.username;
    $('.user-handle', card).textContent = '@' + user.username;
    
    const followBtn = card.querySelector('.follow-btn');
    followBtn.dataset.userId = user.id;
    followBtn.addEventListener('click', () => handleFollow(user.id, followBtn));
    
    container.appendChild(node);
  });
}

function renderFollowingUsers(users, container) {
  container.innerHTML = '';
  if (!users.length) {
    container.textContent = 'You are not following anyone yet';
    return;
  }
  
  users.forEach(user => {
    const template = $('#user-template');
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.user-card');
    
    const initial = (user.full_name || user.username || 'U')[0]?.toUpperCase() || 'U';
    $('.user-avatar', card).textContent = initial;
    $('.user-name', card).textContent = user.full_name || user.username;
    $('.user-handle', card).textContent = '@' + user.username;
    
    const followBtn = card.querySelector('.follow-btn');
    followBtn.textContent = 'Unfollow';
    followBtn.classList.add('unfollow-btn');
    followBtn.dataset.userId = user.id;
    followBtn.addEventListener('click', () => handleUnfollow(user.id, followBtn));
    
    container.appendChild(node);
  });
}

function renderSuggestionsWidget(users) {
  const container = $('#widget-suggestions');
  container.innerHTML = '';
  
  if (!users.length) {
    container.textContent = 'No suggestions';
    return;
  }
  
  users.slice(0, 5).forEach(user => {
    const div = document.createElement('div');
    div.className = 'widget-user';
    div.innerHTML = `
      <div class="widget-user-info">
        <div class="widget-user-avatar">${(user.full_name || user.username || 'U')[0]?.toUpperCase()}</div>
        <div class="widget-user-details">
          <span class="widget-user-name">${user.full_name || user.username}</span>
          <span class="widget-user-handle">@${user.username}</span>
        </div>
      </div>
      <button class="widget-follow-btn" data-user-id="${user.id}">Follow</button>
    `;
    
    const btn = div.querySelector('.widget-follow-btn');
    btn.addEventListener('click', () => {
      handleFollow(user.id, btn);
      btn.textContent = 'Following';
      btn.classList.add('following');
      btn.disabled = true;
    });
    
    container.appendChild(div);
  });
}

async function handleFollow(userId, btn) {
  try {
    await apiFetch('POST', '/api/users/follow', { followeeId: userId });
    btn.textContent = 'Following';
    btn.classList.add('following');
    btn.disabled = true;
  } catch (err) {
    console.error('Failed to follow:', err);
  }
}

async function handleUnfollow(userId, btn) {
  try {
    await apiFetch('DELETE', '/api/users/unfollow', { followeeId: userId });
    // Remove the user from the list
    const userCard = btn.closest('.user-card');
    const container = userCard.closest('.users-list');
    container.removeChild(userCard);
    // If no more users, show empty message
    if (container.querySelectorAll('.user-card').length === 0) {
      container.innerHTML = '<p>You are not following anyone yet</p>';
    }
  } catch (err) {
    console.error('Failed to unfollow:', err);
    alert('Failed to unfollow user');
  }
}

// Create Post
async function handleCreatePost() {
  const content = $('#post-content').value.trim();
  if (!content) {
    alert('Please write something');
    return;
  }
  
  try {
    await apiFetch('POST', '/api/posts', { content });
    $('#post-content').value = '';
    await loadFeed();
  } catch (err) {
    alert('Failed to create post');
  }
}

// Initialize App
async function initApp() {
  const token = localStorage.getItem(tokenKey);
  if (!token) {
    show($('#auth-modal'));
    hide($('#app'));
    return;
  }
  
  try {
    // Get current user from auth profile endpoint
    const res = await apiFetch('GET', '/api/auth/profile');
    currentUser = res.user || { username: 'User', full_name: 'User' };
    
    // Set user info
    const initial = (currentUser.full_name || currentUser.username || 'U')[0]?.toUpperCase() || 'U';
    $('#create-post-avatar').textContent = initial;
    
    // Show app
    hide($('#auth-modal'));
    show($('#app'));
    show($('#create-post-card'));
    
    // Show feed by default
    showFeed();
  } catch (err) {
    console.error('Failed to initialize app:', err);
    localStorage.removeItem(tokenKey);
    show($('#auth-modal'));
    hide($('#app'));
  }
}

// Event Listeners
function bindUI() {
  $('#btn-login').addEventListener('click', handleLogin);
  $('#btn-register').addEventListener('click', handleRegister);
  $('#login-email').addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());
  $('#login-password').addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());
  $('#reg-password').addEventListener('keypress', (e) => e.key === 'Enter' && handleRegister());
  
  $('#btn-logout').addEventListener('click', handleLogout);
  $('#btn-create-post').addEventListener('click', handleCreatePost);
  $('#post-content').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handleCreatePost();
  });

  // Nav buttons (avoid inline handlers to comply with CSP)
  $('#btn-nav-feed')?.addEventListener('click', () => showFeed());
  $('#btn-nav-profile')?.addEventListener('click', () => showProfile());
  $('#btn-nav-followers')?.addEventListener('click', () => showFollowers());
  $('#btn-nav-following')?.addEventListener('click', () => showFollowing());
  $('#btn-nav-suggestions')?.addEventListener('click', () => showSuggestions());

  // Auth modal controls
  $('#btn-auth-close')?.addEventListener('click', closeAuthModal);
  $('#link-switch-register')?.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
  $('#link-switch-login')?.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });
}

// Init
bindUI();
initApp();

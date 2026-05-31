const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

let authTokenGetter = null;
let _currentUserId = null;

export function setAuthTokenGetter(getter) {
  authTokenGetter = typeof getter === "function" ? getter : null;
}

export function setCurrentUserId(id) {
  _currentUserId = id;
}

async function request(path, options = {}) {
  const { userId, ...fetchOptions } = options;
  const authHeaders = {};
  const token = authTokenGetter ? await authTokenGetter() : null;
  const requestUserId = userId ?? _currentUserId;

  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(requestUserId ? { "x-user-id": String(requestUserId) } : {}),
      ...authHeaders,
      ...fetchOptions.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = data?.details || data?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function getAgents() {
  return request("/api/agents");
}

export function getAgent(agentId) {
  return request(`/api/agents/${agentId}`);
}

export function searchAgents(query) {
  return request("/api/agents/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function analyzeAgent(formData) {
  return request("/api/agents/analyze", {
    method: "POST",
    body: formData,
  });
}

export function publishAgent(formData) {
  return request("/api/agents/upload", {
    method: "POST",
    body: formData,
  });
}

export function getAgentReviews(agentId) {
  return request(`/api/agents/${agentId}/reviews`);
}

export function saveAgentReview(agentId, payload) {
  return request(`/api/agents/${agentId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyAgents() {
  return request("/api/me/agents");
}

export function updateAgentVisibility(agentId, visibility, data = {}) {
  const body =
    typeof visibility === "object"
      ? visibility
      : { visibility, ...data };

  return request(`/api/agents/${agentId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteAgent(agentId) {
  return request(`/api/agents/${agentId}`, {
    method: "DELETE",
  });
}

export function followUser(userId) {
  return request(`/api/users/${userId}/follow`, {
    method: "POST",
  });
}

export function unfollowUser(userId) {
  return request(`/api/users/${userId}/follow`, {
    method: "DELETE",
  });
}

export function getUserFollowers(userId) {
  return request(`/api/users/${userId}/followers`);
}

export function getUserFollowing(userId) {
  return request(`/api/users/${userId}/following`);
}

export function getFollowingFeed() {
  return request("/api/feed/following");
}

export function getMyOrganizations() {
  return request("/api/organizations");
}

export function getOrganization(orgId) {
  return request(`/api/organizations/${orgId}`);
}

export function createOrganization(data) {
  return request("/api/organizations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganization(orgId, data) {
  return request(`/api/organizations/${orgId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function addOrgMember(orgId, userId, role = "member") {
  return request(`/api/organizations/${orgId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export function updateOrgMemberRole(orgId, userId, role) {
  return request(`/api/organizations/${orgId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeOrgMember(orgId, userId) {
  return request(`/api/organizations/${orgId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function getApiBaseLabel() {
  return API_BASE_URL || "Vite proxy /api";
}

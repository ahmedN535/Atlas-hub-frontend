const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

let authTokenGetter = null;

export function setAuthTokenGetter(getter) {
  authTokenGetter = typeof getter === "function" ? getter : null;
}

async function request(path, options = {}) {
  const authHeaders = {};
  const token = authTokenGetter ? await authTokenGetter() : null;
  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...options.headers,
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

export function getApiBaseLabel() {
  return API_BASE_URL || "Vite proxy /api";
}

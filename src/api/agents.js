const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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

export function uploadAgent(formData) {
  return request("/api/agents/upload", {
    method: "POST",
    body: formData,
  });
}

export function getApiBaseLabel() {
  return API_BASE_URL || "Vite proxy /api";
}

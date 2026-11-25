import { isContactPreview } from "./session.js";

const BASE_URL = import.meta.env.VITE_API_URL;
let previewRequest = null;
export function configurePreviewApi(request) {
  if (!isContactPreview() || typeof request !== "function") throw new Error("Preview API is development-only");
  previewRequest = request;
}

const getAuthHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("vsph_auth_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function request(method, endpoint, data) {
  if (isContactPreview()) {
    if (!previewRequest) throw new Error("Preview API is not initialized");
    // Never fall through to a configured real backend in preview mode.
    return previewRequest(method, endpoint, data);
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method, headers:getAuthHeaders(),
    ...(method === "GET" ? {} : {body: method === "DELETE" && !data ? undefined : JSON.stringify(data)}),
  });
  return response.json();
}
export const api = {
  get: endpoint => request("GET",endpoint),
  post: (endpoint,data) => request("POST",endpoint,data),
  put: (endpoint,data) => request("PUT",endpoint,data),
  patch: (endpoint,data) => request("PATCH",endpoint,data),
  delete: (endpoint,data) => request("DELETE",endpoint,data),
};

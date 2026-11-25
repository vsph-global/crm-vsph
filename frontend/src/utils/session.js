// Only the explicit Vite development preview may provide a synthetic identity.
// No token is created, and the browser's real localStorage is never changed by this adapter.
export const isContactPreview = () => import.meta.env.DEV && typeof window !== "undefined" && /^\/dev\/contact-preview\/?$/.test(window.location.pathname);
let previewIdentity = null;
export function configurePreviewIdentity(identity) {
  if (!isContactPreview()) throw new Error("Preview identity is development-only");
  previewIdentity = Object.freeze({...identity});
}
export function readSessionValue(key) {
  if (isContactPreview()) return previewIdentity?.[key] ?? null;
  return localStorage.getItem(key);
}

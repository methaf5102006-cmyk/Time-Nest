export function reloadKeep() {
  try {
    sessionStorage.setItem('keepY', String(window.scrollY));
  } catch {
    /* ignore */
  }
  window.location.reload();
}

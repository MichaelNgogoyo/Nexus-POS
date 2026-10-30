/** End the Keycloak SSO session and return to this frontend origin. */
export function logoutFromKeycloak(keycloak) {
  if (!keycloak?.authenticated) {
    window.location.assign('/login');
    return Promise.resolve();
  }

  // Always pass an explicit origin. Without it, keycloak-js may reuse the
  // redirect URI captured at app initialization (which can be a stale URL or
  // a deep link that Keycloak has not allowed as a post-logout destination).
  return keycloak.logout({ redirectUri: window.location.origin });
}

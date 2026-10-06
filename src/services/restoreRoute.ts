const ROUTE_STORAGE_KEY = 'cosmic-atlas-requested-route'

export function restoreRequestedRoute(): void {
  const requestedRoute = window.sessionStorage.getItem(ROUTE_STORAGE_KEY)
  if (!requestedRoute) return

  window.sessionStorage.removeItem(ROUTE_STORAGE_KEY)
  window.history.replaceState(null, '', requestedRoute)
}

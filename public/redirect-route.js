const appBasePath = '/mp2/'
const requestedRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`

window.sessionStorage.setItem('cosmic-atlas-requested-route', requestedRoute)
window.location.replace(appBasePath)

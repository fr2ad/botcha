// This worker exists only so Chrome will fire `beforeinstallprompt` — its
// install algorithm still requires a fetch handler even though installing from
// the browser menu no longer does:
// https://developer.chrome.com/blog/update-install-criteria
//
// The handler is deliberately empty. Not calling respondWith() lets every
// request fall through to the network untouched, so there is no cache to go
// stale after a deploy. Caching a shell would be pointless anyway: the game is
// a live WebSocket, so an offline Botcha has nothing to show.
self.addEventListener('fetch', () => {});

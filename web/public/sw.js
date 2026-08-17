// This worker exists so Chrome will fire `beforeinstallprompt` — its
// install algorithm still requires a fetch handler even though installing from
// the browser menu no longer does:
// https://developer.chrome.com/blog/update-install-criteria
//
// The handler is deliberately empty. Not calling respondWith() lets every
// request fall through to the network untouched, so there is no cache to go
// stale after a deploy. Caching a shell would be pointless anyway: the game is
// a live WebSocket, so an offline Botcha has nothing to show.
self.addEventListener('fetch', () => {});

// Firebase Cloud Messaging (background push — see server/src/scheduler.ts
// for the one notification this app sends, "hearts refilled"). This file is
// served as a static asset, not run through Vite, so it can't read
// import.meta.env — fill these in by hand from the same Firebase project as
// web/.env's VITE_FIREBASE_* vars. Left blank, importScripts below still
// runs but firebase.messaging() never receives a push (no project to
// receive from), so this is a safe no-op until filled in.
const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

if (FIREBASE_CONFIG.apiKey) {
  importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');
  firebase.initializeApp(FIREBASE_CONFIG);
  // onBackgroundMessage fires when a push arrives while Botcha isn't the
  // focused tab — firebase-messaging-compat shows the notification itself
  // whenever the payload includes a `notification` block, so no extra
  // handling is needed here.
  firebase.messaging();
}

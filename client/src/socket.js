import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';
export const socket = io(URL, { autoConnect: false });

// Reconnect immediately when the phone wakes up or user switches back to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !socket.connected) {
    socket.connect();
  }
});

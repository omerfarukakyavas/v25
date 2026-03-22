declare const __firebase_config: any;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBVq3Hvr_3g2giEu7zPnEDKgkWKaBrzsBY',
  authDomain: 'akyavas-hts.firebaseapp.com',
  projectId: 'akyavas-hts',
  storageBucket: 'akyavas-hts.firebasestorage.app',
  messagingSenderId: '245455357063',
  appId: '1:245455357063:web:b3d296b985695094266422'
};

export const appId = 'akyavas-hts';

export const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }

  return DEFAULT_FIREBASE_CONFIG;
};

import * as firebaseApp from 'firebase/app';
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import * as storagePkg from 'firebase/storage';
import * as functionsPkg from 'firebase/functions';
import * as messagingPkg from 'firebase/messaging';

const { initializeApp } = firebaseApp as any;
const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = firestorePkg as any;
const { getAuth } = authPkg as any;
const { getStorage } = storagePkg as any;
const { getFunctions } = functionsPkg as any;
const { getMessaging, isSupported } = messagingPkg as any;

const firebaseConfig = {
  apiKey: "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU",
  authDomain: "one-dental-system.firebaseapp.com",
  projectId: "one-dental-system",
  storageBucket: "one-dental-system.firebasestorage.app",
  messagingSenderId: "963023434254",
  appId: "1:963023434254:web:5e5513ea9de1676aa7825f",
  measurementId: "G-MK756FXZ9N"
};

let app: any;
let db: any;
let auth: any;
let storage: any;
let functions: any;
let messaging: any;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
        app = initializeApp(firebaseConfig);
        
        // Inicialização robusta para Mobile (Android/iOS)
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });

        auth = getAuth(app);
        storage = getStorage(app);
        functions = getFunctions(app, 'us-central1');
        
        isSupported().then((supported: boolean) => {
            if (supported) {
                messaging = getMessaging(app);
            }
        });

        console.log("✅ ProTrack Eco System: Firebase Initialized for Android/Web");
    }
} catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
}

export { db, auth, storage, functions, messaging };

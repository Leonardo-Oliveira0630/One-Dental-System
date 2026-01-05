
import * as firebaseApp from 'firebase/app';
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import * as storagePkg from 'firebase/storage';
import * as functionsPkg from 'firebase/functions';

// Fix: Destructuring from namespace with any casting to satisfy type checker in environments with conflicting typings
const { initializeApp } = firebaseApp as any;
const { getFirestore } = firestorePkg as any;
const { getAuth } = authPkg as any;
const { getStorage } = storagePkg as any;
const { getFunctions } = functionsPkg as any;

// --- CONFIGURAÇÃO DO FIREBASE ---
// Certifique-se de substituir por suas chaves reais se não estiver usando o ambiente de preview
const firebaseConfig = {
   apiKey: "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU",
  authDomain: "one-dental-system.firebaseapp.com",
  projectId: "one-dental-system",
  storageBucket: "one-dental-system.firebasestorage.app",
  messagingSenderId: "963023434254",
  appId: "1:963023434254:web:5e5513ea9de1676aa7825f",
  measurementId: "G-MK756FXZ9N"
};

// Singleton instances
let app: any;
let db: any;
let auth: any;
let storage: any;
let functions: any;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        functions = getFunctions(app, 'us-central1'); // Region must match your deploy
        console.log("✅ Firebase conectado com sucesso!");
    } else {
        console.warn("⚠️ Configuração do Firebase ausente. O app está rodando em MODO OFFLINE (Mock Data).");
    }
} catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
}

export { db, auth, storage, functions };

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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
let app;
let db: any;
let auth: any;
let storage: any;
let functions: any;

try {
    // Check if config exists to avoid crash in environments without env vars set up yet
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
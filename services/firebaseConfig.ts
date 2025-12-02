import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// --- CONFIGURAÇÃO DO FIREBASE ---
// 1. Vá ao Console do Firebase (console.firebase.google.com)
// 2. Crie um projeto e adicione um app Web
// 3. Copie as chaves e cole abaixo

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

try {
    // Only initialize if config is present (prevents errors in preview mode without keys)
    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        console.log("✅ Firebase conectado com sucesso!");
    } else {
        console.warn("⚠️ Configuração do Firebase ausente. O app está rodando em MODO OFFLINE (Mock Data).");
    }
} catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
}

export { db, auth, storage };
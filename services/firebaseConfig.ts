import * as firebaseApp from 'firebase/app';
import * as firestorePkg from 'firebase/firestore';
import * as authPkg from 'firebase/auth';
import * as storagePkg from 'firebase/storage';
import * as functionsPkg from 'firebase/functions';

const { initializeApp } = firebaseApp as any;
const { getFirestore, enableMultiTabIndexedDbPersistence } = firestorePkg as any;
const { getAuth } = authPkg as any;
const { getStorage } = storagePkg as any;
const { getFunctions } = functionsPkg as any;

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

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        functions = getFunctions(app, 'us-central1');

        // ATIVAÇÃO DO MODO OFFLINE
        enableMultiTabIndexedDbPersistence(db).catch((err: any) => {
            if (err.code === 'failed-precondition') {
                console.warn("Persistência offline falhou: Múltiplas abas abertas.");
            } else if (err.code === 'unimplemented') {
                console.warn("O navegador não suporta persistência offline.");
            }
        });

        console.log("✅ Firebase com Suporte Offline ativado!");
    }
} catch (error) {
    console.error("❌ Erro ao inicializar Firebase:", error);
}

export { db, auth, storage, functions };
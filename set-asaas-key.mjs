import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU",
  authDomain: "one-dental-system.firebaseapp.com",
  projectId: "one-dental-system",
  appId: "1:963023434254:web:5e5513ea9de1676aa7825f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const key = "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA3NGNiNzc5LTMwOGItNGRkNi05NTIwLWY1MGFlY2NjZjkwMzo6JGFhY2hfOTYzMjJiMTEtYTRjNi00OTkwLTgzZTktYmM3ZTdkODExZmM2";
    await setDoc(doc(db, 'settings', 'global'), { asaasApiKey: key }, { merge: true });
    console.log("SUCCESS!");
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}

run();

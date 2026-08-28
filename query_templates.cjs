const admin = require("firebase-admin");
const serviceAccount = require("./firebase-applet-config.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const db = admin.firestore();
  const snap = await db.collection("settings").doc("global").get();
  console.log(JSON.stringify(snap.data()?.globalWhatsappTemplates, null, 2));
}

run();

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'ais-dev-ywd6wg7lfmjqtjv4s7js4r' });
const db = admin.firestore();
async function run() {
  const snaps = await db.collection('communication_channels').get();
  snaps.forEach(doc => console.log(doc.id, doc.data()));
}
run().then(() => process.exit(0)).catch(console.error);

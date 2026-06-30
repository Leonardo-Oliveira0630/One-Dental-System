const projectId = "one-dental-system";
const apiKey = "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/global?key=${apiKey}`;

async function run() {
  const response = await fetch(url);
  const text = await response.text();
  console.log(response.status, text);
}

run();

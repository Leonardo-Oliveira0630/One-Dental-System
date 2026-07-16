const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

if (code.includes('serviceAccount: "one-dental-system@appspot.gserviceaccount.com",')) {
  code = code.replace(
    /\s*serviceAccount: "one-dental-system@appspot.gserviceaccount.com",\n/,
    '\n'
  );
  fs.writeFileSync('functions/src/index.ts', code);
  console.log("Service account removed!");
} else {
  console.log("serviceAccount not found");
}

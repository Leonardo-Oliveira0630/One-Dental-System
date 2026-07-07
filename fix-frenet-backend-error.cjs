const fs = require('fs');

const file = 'functions/src/index.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // We need to replace the error throwing block in calculateFrenetShipping
  const regex = /catch \(err: any\) \{\n\s+throw new HttpsError\('internal', err\.response\?\.data\?\.Message \|\| err\.message\);\n\s+\}/g;
  
  if (content.match(regex)) {
    content = content.replace(regex, `catch (err: any) {\n    return { error: err.response?.data?.Message || err.message };\n  }`);
    fs.writeFileSync(file, content);
    console.log("Functions updated");
  } else {
    console.log("Regex not found in functions/src/index.ts. Let's try another approach.");
  }
}

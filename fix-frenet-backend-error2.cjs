const fs = require('fs');
const file = 'functions/src/index.ts';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace throw new HttpsError('invalid-argument'...
  content = content.replace(/throw new HttpsError\('invalid-argument', 'Missing CEP or Frenet Token\.'\);/g, "return { error: 'Missing CEP or Frenet Token.' };");
  
  // Replace the catch internal throw if it wasn't caught by my previous regex
  content = content.replace(/catch \(err: any\) \{\n    throw new HttpsError\('internal', err\.response\?\.data\?\.Message \|\| err\.message\);\n  \}/g, `catch (err: any) {\n    return { error: err.response?.data?.Message || err.message };\n  }`);

  fs.writeFileSync(file, content);
}

const clientFile = 'services/firebaseService.ts';
if (fs.existsSync(clientFile)) {
  let content = fs.readFileSync(clientFile, 'utf8');
  content = content.replace(/return \(await fn\(payload\)\)\.data;/g, `const result = (await fn(payload)).data as any;\n  if (result?.error) throw new Error(result.error);\n  return result;`);
  fs.writeFileSync(clientFile, content);
}

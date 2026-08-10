const { execSync } = require('child_process');
try {
  execSync('npm run lint', {stdio: 'inherit'});
  console.log("Success");
} catch(e) {
  console.log("Error");
}

const fs = require('fs');
const lines = fs.readFileSync('pages/NewJob.tsx', 'utf8').split('\n');

const errLines = [947, 1007, 1457, 1504, 1505, 1506, 1507, 1508, 1509];

errLines.forEach(l => {
  console.log(`\nLine ${l}:`);
  for (let i = Math.max(0, l - 5); i < Math.min(lines.length, l + 5); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
});

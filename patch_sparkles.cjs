const fs = require('fs');
let code = fs.readFileSync('components/ui/sparkles.tsx', 'utf8');

code = code.replace(/import Particles, { initParticlesEngine } from "@tsparticles\/react"/, 'import Particles from "@tsparticles/react";\nimport { tsParticles } from "@tsparticles/engine";');
code = code.replace(/initParticlesEngine\(async \(engine\) => {\n\s*await loadSlim\(engine\)\n\s*}\)\.then\(\(\) => {\n\s*setIsReady\(true\)\n\s*}\)/, 'loadSlim(tsParticles).then(() => setIsReady(true))');

fs.writeFileSync('components/ui/sparkles.tsx', code);
console.log("Patched sparkles.tsx");

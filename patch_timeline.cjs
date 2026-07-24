const fs = require('fs');
let code = fs.readFileSync('components/ui/timeline-animation.tsx', 'utf8');

code = code.replace(/const Component = motion\[as as keyof typeof motion\] \|\| motion\.div;/g, 'const Component = (motion as any)[as] || motion.div;');
fs.writeFileSync('components/ui/timeline-animation.tsx', code);
console.log("Patched timeline-animation");

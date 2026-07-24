const fs = require('fs');
let code = fs.readFileSync('components/ui/vertical-cut-reveal.tsx', 'utf8');

code = code.replace(/import { DynamicAnimationOptions, motion } from "framer-motion"/, 'import { motion } from "framer-motion"');
code = code.replace(/transition\?: DynamicAnimationOptions/, 'transition?: any');

// Also fix: components/ui/vertical-cut-reveal.tsx(71,36): error TS2339: Property 'Segmenter' does not exist on type 'typeof Intl'.
code = code.replace(/new Intl\.Segmenter/g, 'new (Intl as any).Segmenter');

fs.writeFileSync('components/ui/vertical-cut-reveal.tsx', code);
console.log("Patched vertical-cut-reveal");

const fs = require('fs');
let code = fs.readFileSync('components/ui/timeline-animation.tsx', 'utf8');

code = code.replace(/<Component\s*ref={ref}\s*className={className}\s*custom={animationNum}\s*initial="hidden"\s*animate={inView \? "visible" : "hidden"}\s*variants={customVariants}\s*>/m, '{React.createElement(Component as any, { ref, className, custom: animationNum, initial: "hidden", animate: inView ? "visible" : "hidden", variants: customVariants }, children)}');
code = code.replace(/\{children\}\n\s*<\/Component>/, '');

fs.writeFileSync('components/ui/timeline-animation.tsx', code);
console.log("Patched timeline-animation.tsx");

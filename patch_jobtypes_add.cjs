const fs = require('fs');
let content = fs.readFileSync('pages/JobTypes.tsx', 'utf8');

content = content.replace(
    'const [isVisibleInternally, setIsVisibleInternally] = useState(true);',
    \`const [isVisibleInternally, setIsVisibleInternally] = useState(true);
  const [isVisibleInternallyLabs, setIsVisibleInternallyLabs] = useState(false);\`
);

content = content.replace(
    'setIsVisibleInternally(isFreeLab ? false : (type.isVisibleInternally !== false));',
    \`setIsVisibleInternally(isFreeLab ? false : (type.isVisibleInternally !== false));
    setIsVisibleInternallyLabs(type.isVisibleInternallyLabs || false);\`
);

content = content.replace(
    'isVisibleInternally,',
    \`isVisibleInternally,
          isVisibleInternallyLabs,\`
);

content = content.replace(
    \`<span className="text-xs font-bold text-slate-800">Trabalhos Internos</span>\`,
    \`<span className="text-xs font-bold text-slate-800">Trabalhos Internos (Dentistas)</span>\`
);

fs.writeFileSync('pages/JobTypes.tsx', content);
console.log('patched jobtypes');

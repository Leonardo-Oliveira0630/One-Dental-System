const fs = require('fs');

let typesContent = fs.readFileSync('types.ts', 'utf8');

// Replace string[] with object array for subDentists
typesContent = typesContent.replace(/subDentists\?\: string\[\];/g, "subDentists?: { id: string; name: string; cro?: string; }[];");

// Add subDentistName?: string to Job interface
typesContent = typesContent.replace(/export interface Job \{/, "export interface Job {\n  subDentistName?: string;");

fs.writeFileSync('types.ts', typesContent);
console.log('types.ts updated');

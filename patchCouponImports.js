import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const importCode = `import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';\nimport { db } from '../../lib/firebase';`;

if (!content.includes('firebase/firestore')) {
    content = content.replace("import React, { useState, useMemo, useEffect } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';\n" + importCode);
}

// Fix api.query to query, api.collection to collection, etc.
content = content.replace(/api\.query/g, "query");
content = content.replace(/api\.collection/g, "collection");
content = content.replace(/api\.db/g, "db");
content = content.replace(/api\.where/g, "where");
content = content.replace(/api\.getDocs/g, "getDocs");

fs.writeFileSync(filePath, content);

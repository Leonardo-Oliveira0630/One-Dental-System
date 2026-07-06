import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import \{ db \} from '\.\.\/\.\.\/services\/firebaseService';/g, "import { db } from '../../services/firebaseConfig';");
  content = content.replace(/import \{ db \} from '\.\.\/\.\.\/lib\/firebase';/g, "import { db } from '../../services/firebaseConfig';");
  fs.writeFileSync(filePath, content);
}

fixFile(path.join(process.cwd(), 'pages/supplier/Coupons.tsx'));
fixFile(path.join(process.cwd(), 'pages/store/SupplierStore.tsx'));


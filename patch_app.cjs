const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes('import { NFCReader } from \\\'./pages/NFCReader\\\';')) {
    code = code.replace(
        'import { Login } from \\\'./pages/Login\\\';',
        'import { Login } from \\\'./pages/Login\\\';\\nimport { NFCReader } from \\\'./pages/NFCReader\\\';'
    );
    
    code = code.replace(
        '<Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />',
        '<Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />\\n      <Route path="/nfc" element={<ProtectedRoute><NFCReader /></ProtectedRoute>} />'
    );
    
    fs.writeFileSync('App.tsx', code);
}

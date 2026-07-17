const fs = require('fs');
let code = fs.readFileSync('components/WhatsAppChannelSettings.tsx', 'utf8');

code = code.replace(/const \[phoneNumber, setPhoneNumber\] = useState\(''\);/, "const [phoneNumber, setPhoneNumber] = useState('');\n  const [apiKey, setApiKey] = useState('');");

const fetchRegex = /setPhoneNumber\(docData\.data\(\)\.phoneNumber \|\| ''\);/;
code = code.replace(fetchRegex, "setPhoneNumber(docData.data().phoneNumber || '');\n          setApiKey(docData.data().apiKey || '');");

const updateRegex = /phoneNumber: phoneNumber\.replace\(\/\\D\/g, ''\),\n\s*updatedAt: serverTimestamp\(\)/;
code = code.replace(updateRegex, "phoneNumber: phoneNumber.replace(/\\D/g, ''),\n          apiKey: apiKey.trim(),\n          updatedAt: serverTimestamp()");

const addRegex = /phoneNumber: phoneNumber\.replace\(\/\\D\/g, ''\),\n\s*status: 'ACTIVE'/;
code = code.replace(addRegex, "phoneNumber: phoneNumber.replace(/\\D/g, ''),\n          apiKey: apiKey.trim(),\n          status: 'ACTIVE'");

const renderRegex = /<\/div>\n\s*<button/;
const newRender = `</div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sua API Key (Opcional - YCloud)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Deixe em branco para usar a API Global"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button`;
code = code.replace(renderRegex, newRender);

fs.writeFileSync('components/WhatsAppChannelSettings.tsx', code);
console.log('Fixed channel settings');

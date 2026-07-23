const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

if (!code.includes('export const ManualScannerInput')) {
    code = code + `

export const ManualScannerInput: React.FC = () => {
    const [value, setValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) {
                window.dispatchEvent(new CustomEvent('manual-scan-trigger', { detail: { code: value.trim() } }));
                setValue('');
            }
        }
    };

    return (
        <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400">
                <ScanBarcode size={16} />
            </div>
            <input 
                type="text" 
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Bipar Caixa/OS..." 
                className="w-48 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:font-normal"
            />
        </div>
    );
};
`;

    // Also add listener for manual-scan-trigger in GlobalScanner
    code = code.replace(
        'window.addEventListener(\'open-scanner\', handleOpenScanner);',
        `window.addEventListener('open-scanner', handleOpenScanner);
    const handleManualTrigger = (e: any) => {
        if (e.detail?.code && processScanRef.current) {
            processScanRef.current(e.detail.code);
        }
    };
    window.addEventListener('manual-scan-trigger', handleManualTrigger);`
    );

    code = code.replace(
        'window.removeEventListener(\'open-scanner\', handleOpenScanner);',
        `window.removeEventListener('open-scanner', handleOpenScanner);
        window.removeEventListener('manual-scan-trigger', handleManualTrigger);`
    );

    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("Scanner input patched");
}

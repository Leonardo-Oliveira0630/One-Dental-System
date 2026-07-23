const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const target = `return (
          <button 
            onClick={() => setIsCameraActive(true)}
            className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden print:hidden"
          >
              <Camera size={28} />
          </button>
      );`;

const replacement = `return (
          <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] flex flex-col gap-3 items-center md:hidden print:hidden">
              {isNfcSupported && nfcStatus !== 'scanning' && (
                 <button 
                   onClick={() => (window as any).triggerNfcStart?.()}
                   className="w-12 h-12 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                   title="Ativar NFC"
                 >
                     <span className="font-black text-[10px]">NFC</span>
                 </button>
              )}
              <button 
                onClick={() => setIsCameraActive(true)}
                className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              >
                  <Camera size={28} />
              </button>
          </div>
      );`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Scanner.tsx', code);
    console.log("NFC button patched");
}

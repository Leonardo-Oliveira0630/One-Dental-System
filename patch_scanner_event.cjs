const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const eventLogic = `
      // Escutar evento customizado nfcScan
      const handleNfcScan = (e: any) => {
          if (e.detail && e.detail.code) {
              processScan(e.detail.code);
          }
      };
      window.addEventListener('nfcScan', handleNfcScan);

      return () => {
          window.removeEventListener('keydown', handleGlobalKeyDown);
          window.removeEventListener('nfcScan', handleNfcScan);
      };
`;

code = code.replace(
`      return () => {
          window.removeEventListener('keydown', handleGlobalKeyDown);
      };`, eventLogic);

fs.writeFileSync('components/Scanner.tsx', code);

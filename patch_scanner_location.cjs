const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

code = code.replace(
    'import { useNavigate } from \\\'react-router-dom\\\';',
    'import { useNavigate, useLocation } from \\\'react-router-dom\\\';'
);

code = code.replace(
    'const navigate = useNavigate();',
    `const navigate = useNavigate();
  const location = useLocation();
  
  // Check location state for NFC scans
  useEffect(() => {
      if (location.state?.nfcScanCode) {
          const code = location.state.nfcScanCode;
          // Clear the state to avoid re-triggering
          navigate(location.pathname, { replace: true, state: { ...location.state, nfcScanCode: undefined } });
          
          // Process scan after a small delay to ensure everything is mounted
          setTimeout(() => {
              processScan(code);
          }, 300);
      }
  }, [location.state?.nfcScanCode, navigate, location.pathname, processScan]);`
);

fs.writeFileSync('components/Scanner.tsx', code);

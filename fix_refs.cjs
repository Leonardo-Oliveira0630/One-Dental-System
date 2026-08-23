const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const refsUpdate = `
  useEffect(() => {
    currentUserRef.current = currentUser;
    isCameraActiveRef.current = isCameraActive;
    jobsRef.current = jobs;
    jobMapRef.current = jobMap;
    commissionsRef.current = commissions;
    jobTypesRef.current = jobTypes;
    scannedJobRef.current = scannedJob;
    scanActionRef.current = scanAction;
    nextSectorRef.current = nextSector;
    nfcBoxesRef.current = nfcBoxes;
  }, [currentUser, isCameraActive, jobs, jobMap, commissions, jobTypes, scannedJob, scanAction, nextSector, nfcBoxes]);
`;

// Insert after `const nfcBoxesRef = useRef(nfcBoxes);`
code = code.replace(/const nfcBoxesRef = useRef\(nfcBoxes\);/g, "const nfcBoxesRef = useRef(nfcBoxes);\n" + refsUpdate);

fs.writeFileSync('components/Scanner.tsx', code);

const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf-8');

if (!content.includes("import { WebcamModal }")) {
    content = content.replace(
        "import { calculateItemCommission } from '../utils/commissionUtils';", 
        "import { calculateItemCommission } from '../utils/commissionUtils';\nimport { WebcamModal } from '../components/WebcamModal';"
    );
}

const targetDiv = `        </div>
      )}
       {selectedAttachment && (`;
const newModalDiv = `        </div>
      )}
      
      {isWebcamOpen && (
        <WebcamModal 
          onClose={() => setIsWebcamOpen(false)}
          onCapture={(file) => {
            setSelectedFiles(prev => [...prev, file]);
            setIsWebcamOpen(false);
          }}
        />
      )}

       {selectedAttachment && (`;

content = content.replace(targetDiv, newModalDiv);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('Successfully patched JobDetails.tsx 2');

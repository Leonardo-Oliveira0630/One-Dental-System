const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
    '<AttachmentPreviewModal',
    '<WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleWebcamCapture} />\n           <AttachmentPreviewModal'
);

fs.writeFileSync('pages/JobDetails.tsx', content);

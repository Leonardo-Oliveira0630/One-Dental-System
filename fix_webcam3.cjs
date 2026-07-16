const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
    '{selectedAttachment && (\\n           <WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleWebcamCapture} />\\n           <AttachmentPreviewModal',
    '<WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleWebcamCapture} />\\n       {selectedAttachment && (\\n           <AttachmentPreviewModal'
);

// Actually, since there are spaces and newlines, let's just do:
content = content.replace(
    '{selectedAttachment && (\n           <WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleWebcamCapture} />\n           <AttachmentPreviewModal',
    '<WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleWebcamCapture} />\n       {selectedAttachment && (\n           <AttachmentPreviewModal'
);

fs.writeFileSync('pages/JobDetails.tsx', content);

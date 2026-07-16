const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// 1. Add WebcamModal import
if (!content.includes('WebcamModal')) {
    content = content.replace(
        "import { useParams, useNavigate } from 'react-router-dom';",
        "import { useParams, useNavigate } from 'react-router-dom';\nimport { WebcamModal } from '../components/WebcamModal';"
    );
}

// 2. Add isWebcamOpen state
if (!content.includes('isWebcamOpen')) {
    content = content.replace(
        "const [isUploadingFiles, setIsUploadingFiles] = useState(false);",
        "const [isUploadingFiles, setIsUploadingFiles] = useState(false);\n  const [isWebcamOpen, setIsWebcamOpen] = useState(false);"
    );
}

// 3. Add handleWebcamCapture
if (!content.includes('handleWebcamCapture')) {
    content = content.replace(
        "const handleTakePhoto = async () => {",
        `const handleWebcamCapture = async (base64String: string) => {
    if (!job || !currentUser) return;
    try {
        setIsUploadingFiles(true);
        setUploadProgressMsg('Enviando foto da webcam...');
        
        // Remove the data:image/jpeg;base64, part
        const base64Data = base64String.split(',')[1];
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const file = new File([blob], \`webcam_\${Date.now()}.jpg\`, { type: 'image/jpeg' });
        
        await uploadJobAttachment(job.id, file, currentUser);
        
        // Refresh job
        const updatedJob = await getJobById(job.id, job.organizationId);
        if (updatedJob) setJob(updatedJob);
    } catch (e: any) {
        alert("Erro ao enviar foto: " + e.message);
    } finally {
        setIsUploadingFiles(false);
        setUploadProgressMsg('');
    }
  };

  const handleTakePhoto = async () => {`
    );
}

// 4. Render WebcamModal and Button
// Search for CameraIcon
content = content.replace(
    /<button[^>]*onClick=\{handleTakePhoto\}[^>]*>[\s\S]*?<CameraIcon size=\{28\}[^>]*>[\s\S]*?<span[^>]*>Foto<\/span>[\s\S]*?<\/button>/g,
    `$&
                                <button 
                                    onClick={() => setIsWebcamOpen(true)}
                                    disabled={isUploadingFiles}
                                    className="w-20 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 group hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2 shrink-0"
                                >
                                    <Camera size={28} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center leading-tight">Webcam<br/>PC</span>
                                </button>`
);

content = content.replace(
    '{job.status !== JobStatus.DELIVERED && job.status !== JobStatus.CANCELED && (',
    `<WebcamModal 
                isOpen={isWebcamOpen} 
                onClose={() => setIsWebcamOpen(false)} 
                onCapture={handleWebcamCapture} 
            />\n            {job.status !== JobStatus.DELIVERED && job.status !== JobStatus.CANCELED && (`
);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('JobDetails updated successfully.');

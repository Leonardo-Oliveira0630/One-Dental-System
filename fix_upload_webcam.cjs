const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const replacement = `
        const url = await uploadFile(file);
        
        const newAttachment: Attachment = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: url,
            uploadedAt: new Date()
        };

        const updatedAttachments = [...(job.attachments || []).filter(Boolean), newAttachment];
        
        const newHistory = [...(job.history || []).filter(Boolean), {
            id: \`hist_photo_\${Date.now()}\`,
            timestamp: new Date(),
            action: 'Nova foto adicionada via webcam',
            userId: currentUser.id,
            userName: currentUser.name
        }];

        await updateJob(job.id, { 
            attachments: updatedAttachments,
            history: newHistory
        });
        
        setJob({ 
            ...job, 
            attachments: updatedAttachments,
            history: newHistory
        });
`;

content = content.replace(
    /await uploadJobAttachment\(job\.id, file, currentUser\);[\s\S]*?if \(updatedJob\) setJob\(updatedJob\);/m,
    replacement.trim()
);

fs.writeFileSync('pages/JobDetails.tsx', content);

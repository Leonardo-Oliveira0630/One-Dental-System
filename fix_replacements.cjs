const fs = require('fs');
let content = fs.readFileSync('functions/src/index.ts', 'utf8');

// The original lines were like this:
// await getTemplateAndSend(orgId, "CLINIC_APPOINTMENT", { patient_name: "X" }, phone);
// I replaced them with:
// await communicationService.sendTemplateMessage(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", { patient_name: "X" }, phone);
// Wait, the `, phone);` was on another line! 

content = content.replace(
    /await communicationService\.sendTemplateMessage\(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", \{\n    patient_name: patient\.name,\n    date: dateStr,\n    time: timeStr\n  \}, phone\);/g,
    'await communicationService.sendTemplateMessage(orgId, phone, "CLINIC", "CLINIC_APPOINTMENT", {\n    patient_name: patient.name,\n    date: dateStr,\n    time: timeStr\n  });'
);

content = content.replace(
    /await communicationService\.sendTemplateMessage\(orgId, info\.phone, "LAB", "LAB_DISPATCH", \{\n         dentist_name: info\.dentistName,\n         jobs_list: jobsListStr\n       \}, phone\);/g,
    'await communicationService.sendTemplateMessage(orgId, phone, "LAB", "LAB_DISPATCH", {\n         dentist_name: info.dentistName,\n         jobs_list: jobsListStr\n       });'
);

content = content.replace(
    /await communicationService\.sendTemplateMessage\(after\.supplierId, customerPhone, "SUPPLIER", "SUPPLIER_UPDATE", \{\n       order_id: event\.params\.orderId,\n       status: readableStatus\n     \}, phone\);/g,
    'await communicationService.sendTemplateMessage(after.supplierId, customerPhone, "SUPPLIER", "SUPPLIER_UPDATE", {\n       order_id: event.params.orderId,\n       status: readableStatus\n     });'
);

content = content.replace(
    /await communicationService\.sendTemplateMessage\(orgId, after\.dentistPhone, "LAB", "LAB_DELIVERED", \{\n         dentist_name: after\.dentistName \|\| "Dentista",\n         jobs_list: `- \$\{after\.patientName\} \(OS: \$\{osNumber\}\)`\n       \}, phone\);/g,
    'await communicationService.sendTemplateMessage(orgId, phone, "LAB", "LAB_DELIVERED", {\n         dentist_name: after.dentistName || "Dentista",\n         jobs_list: `- ${after.patientName} (OS: ${osNumber})`\n       });'
);

fs.writeFileSync('functions/src/index.ts', content);

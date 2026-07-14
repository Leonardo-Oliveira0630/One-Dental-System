const fs = require('fs');

const filesToFix = [
  'pages/admin/OrganizationTab.tsx',
  'pages/clinic/ClinicSettings.tsx',
  'pages/lab/RoutePlanner.tsx'
];

for (const f of filesToFix) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/twilioSettings/g, 'ycloudSettings');
    content = content.replace(/twilioAccountSid/g, 'ycloudApiKey');
    content = content.replace(/twilioFromNumber/g, 'ycloudFromNumber');
    content = content.replace(/setTwilioAccountSid/g, 'setYcloudApiKey');
    content = content.replace(/setTwilioFromNumber/g, 'setYcloudFromNumber');
    content = content.replace(/twilioAuthToken/g, 'twilioAuthTokenRemoved');
    content = content.replace(/setTwilioAuthToken/g, 'setTwilioAuthTokenRemoved');
    
    // Removing authToken state
    content = content.replace(/const \[twilioAuthTokenRemoved[\s\S]*?;\n/g, '');
    content = content.replace(/setTwilioAuthTokenRemoved.*\n/g, '');
    content = content.replace(/authToken: twilioAuthTokenRemoved.*\n/g, '');
    
    // Changing imports for services
    content = content.replace(/twilioService/g, 'ycloudService');
    content = content.replace(/Twilio/g, 'Ycloud');
    
    // Form labels
    content = content.replace(/Twilio Account SID/g, 'Ycloud API Key');
    content = content.replace(/Twilio Phone Number/g, 'WhatsApp Number (From)');
    
    fs.writeFileSync(f, content);
  }
}
console.log('Fixed frontend files');

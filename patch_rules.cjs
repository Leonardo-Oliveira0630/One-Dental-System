const fs = require('fs');
const content = fs.readFileSync('firestore.rules', 'utf8');

const newContent = content.replace(
  '    match /support_tickets/{ticketId} {',
  `    match /communication_channels/{channelId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || resource.data.orgId == getUserData().get('organizationId', ''));
      allow create: if isAuthenticated() && (isSuperAdmin() || request.resource.data.orgId == getUserData().get('organizationId', ''));
      allow update: if isAuthenticated() && (isSuperAdmin() || (resource.data.orgId == getUserData().get('organizationId', '') && request.resource.data.orgId == getUserData().get('organizationId', '')));
      allow delete: if isAuthenticated() && (isSuperAdmin() || resource.data.orgId == getUserData().get('organizationId', ''));
    }
    match /message_templates/{templateId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || resource.data.orgId == getUserData().get('organizationId', '') || resource.data.orgId == 'GLOBAL');
      allow create: if isAuthenticated() && (isSuperAdmin() || request.resource.data.orgId == getUserData().get('organizationId', ''));
      allow update: if isAuthenticated() && (isSuperAdmin() || (resource.data.orgId == getUserData().get('organizationId', '') && request.resource.data.orgId == getUserData().get('organizationId', '')));
      allow delete: if isAuthenticated() && (isSuperAdmin() || resource.data.orgId == getUserData().get('organizationId', ''));
    }
    match /message_logs/{logId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || resource.data.orgId == getUserData().get('organizationId', ''));
      allow create: if isAuthenticated() && (isSuperAdmin() || request.resource.data.orgId == getUserData().get('organizationId', ''));
    }
    match /support_tickets/{ticketId} {`
);

fs.writeFileSync('firestore.rules', newContent);
console.log("Patched rules!");

const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const replacement = `      match /jobs/{jobId}/messages/{messageId} {
        allow read: if isAuthenticated() && (
          isSuperAdmin() || 
          (belongsToOrg(orgId) && getUserData().get('role', 'USER') != 'CLIENT') ||
          (resource.data.get('senderId', '') == request.auth.uid) ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistId == request.auth.uid ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistUserId == request.auth.uid
        );
        allow write: if isAuthenticated() && (
          isSuperAdmin() || 
          (belongsToOrg(orgId) && getUserData().get('role', 'USER') != 'CLIENT') ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistId == request.auth.uid ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistUserId == request.auth.uid
        );
      }

      match /jobs/{jobId}/caseApprovals/{approvalId} {
        allow read: if isAuthenticated() && (
          isSuperAdmin() || 
          (belongsToOrg(orgId) && getUserData().get('role', 'USER') != 'CLIENT') ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistId == request.auth.uid ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistUserId == request.auth.uid
        );
        allow write: if isAuthenticated() && (
          isSuperAdmin() || 
          (belongsToOrg(orgId) && getUserData().get('role', 'USER') != 'CLIENT') ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistId == request.auth.uid ||
          get(/databases/$(database)/documents/organizations/$(orgId)/jobs/$(jobId)).data.dentistUserId == request.auth.uid
        );
      }`;

rules = rules.replace(/match \/jobs\/\{jobId\}\/messages\/\{messageId\} \{[\s\S]*?\}\n\s*\}/m, replacement);

fs.writeFileSync('firestore.rules', rules);
console.log("Patched rules!");

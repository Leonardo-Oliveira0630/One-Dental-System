const fs = require('fs');
let manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');

const permissions = `
    <!-- Permissoes de Camera, Audio e Localizacao -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <!-- Permissao para NFC Nativo -->
    <uses-permission android:name="android.permission.NFC" />

    <application
`;

manifest = manifest.replace(/<application/g, permissions);
fs.writeFileSync('android/app/src/main/AndroidManifest.xml', manifest);

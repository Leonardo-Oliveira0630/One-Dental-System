import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const iosDir = path.join(rootDir, 'ios');
const iosAppRoot = path.join(iosDir, 'App');
const iosTargetDir = path.join(iosAppRoot, 'App');
const pbxprojPath = path.join(iosAppRoot, 'App.xcodeproj', 'project.pbxproj');
const infoPlistPath = path.join(iosTargetDir, 'Info.plist');
const appDelegatePath = path.join(iosTargetDir, 'AppDelegate.swift');
const sceneDelegatePath = path.join(iosTargetDir, 'SceneDelegate.swift');
const podfilePath = path.join(iosAppRoot, 'Podfile');

if (!fs.existsSync(iosTargetDir) || !fs.existsSync(pbxprojPath)) {
  console.log('[Labprox iOS] Pasta ios/App ainda não encontrada — execute "npx cap add ios" quando for gerar o projeto iOS.');
  process.exit(0);
}

const capCliPkgUrl = new URL('../node_modules/@capacitor/cli/package.json', import.meta.url);
const capRequire = fs.existsSync(capCliPkgUrl) ? createRequire(capCliPkgUrl) : require;
const plist = capRequire('plist');
const xcode = capRequire('xcode');

const SCENE_DELEGATE_SWIFT = `import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
`;

const CONFIGURATION_FOR_CONNECTING_SNIPPET = `
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
`;

function findGroupUuidByComment(project, comment) {
  const groups = project.hash?.project?.objects?.PBXGroup || {};
  const suffix = '_comment';
  for (const key of Object.keys(groups)) {
    if (key.endsWith(suffix) && groups[key] === comment) {
      return key.slice(0, key.length - suffix.length);
    }
  }
  return null;
}

function insertBeforeAppDelegateClassEnd(source, snippet) {
  const match = source.match(/\bclass\s+AppDelegate\b[^{]*\{/);
  if (!match || match.index === undefined) return null;
  const openIdx = source.indexOf('{', match.index);
  if (openIdx === -1) return null;
  let depth = 1;
  let i = openIdx + 1;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  const closeIdx = i - 1;
  return source.slice(0, closeIdx) + snippet + source.slice(closeIdx);
}

let changes = 0;

// 1. Ensure SceneDelegate.swift exists
if (!fs.existsSync(sceneDelegatePath)) {
  fs.writeFileSync(sceneDelegatePath, SCENE_DELEGATE_SWIFT, 'utf-8');
  console.log('[Labprox iOS] SceneDelegate.swift criado.');
  changes++;
} else {
  const existingSceneDelegate = fs.readFileSync(sceneDelegatePath, 'utf-8');
  if (!existingSceneDelegate.includes('UIWindowSceneDelegate') || !existingSceneDelegate.includes('CAPBridgeViewController')) {
    fs.writeFileSync(sceneDelegatePath, SCENE_DELEGATE_SWIFT, 'utf-8');
    console.log('[Labprox iOS] SceneDelegate.swift atualizado para UIScene lifecycle do Capacitor 8.');
    changes++;
  }
}

// 2. Register SceneDelegate.swift in Xcode project & bump deployment target to 15.0
try {
  const project = xcode.project(pbxprojPath);
  project.parseSync();
  let pbxChanged = false;

  if (!project.hasFile('SceneDelegate.swift')) {
    const groupUuid = findGroupUuidByComment(project, 'App');
    if (groupUuid) {
      const targetUuid = project.getFirstTarget().uuid;
      const added = project.addSourceFile('SceneDelegate.swift', { target: targetUuid }, groupUuid);
      if (added) {
        console.log('[Labprox iOS] SceneDelegate.swift registrado no target App do Xcode.');
        pbxChanged = true;
      }
    }
  }

  let pbxContent = pbxChanged ? project.writeSync() : fs.readFileSync(pbxprojPath, 'utf-8');
  const updatedTargetContent = pbxContent.replace(
    /IPHONEOS_DEPLOYMENT_TARGET = (\d+(?:\.\d+)?);/g,
    (full, ver) => (parseFloat(ver) < 15.0 ? 'IPHONEOS_DEPLOYMENT_TARGET = 15.0;' : full)
  );
  if (updatedTargetContent !== pbxContent) {
    pbxContent = updatedTargetContent;
    console.log('[Labprox iOS] IPHONEOS_DEPLOYMENT_TARGET atualizado para 15.0 no Xcode.');
    pbxChanged = true;
  }

  if (pbxChanged) {
    fs.writeFileSync(pbxprojPath, pbxContent, 'utf-8');
    changes++;
  }
} catch (err) {
  console.warn('[Labprox iOS] Aviso ao atualizar project.pbxproj:', err?.message || err);
}

// 3. Patch AppDelegate.swift with configurationForConnecting
if (fs.existsSync(appDelegatePath)) {
  const appDelegateSource = fs.readFileSync(appDelegatePath, 'utf-8');
  if (!appDelegateSource.includes('configurationForConnecting') && !appDelegateSource.includes('UISceneConfiguration(')) {
    const patched = insertBeforeAppDelegateClassEnd(appDelegateSource, CONFIGURATION_FOR_CONNECTING_SNIPPET);
    if (patched) {
      fs.writeFileSync(appDelegatePath, patched, 'utf-8');
      console.log('[Labprox iOS] AppDelegate.swift atualizado com configurationForConnecting para UIScene.');
      changes++;
    }
  }
}

// 4. Patch Info.plist with UIApplicationSceneManifest, Display Name, iPad orientations and privacy keys
if (fs.existsSync(infoPlistPath)) {
  const entries = plist.parse(fs.readFileSync(infoPlistPath, 'utf-8'));
  let plistChanged = false;

  if (!entries.UIApplicationSceneManifest) {
    entries.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
            UISceneStoryboardFile: 'Main',
          },
        ],
      },
    };
    console.log('[Labprox iOS] UIApplicationSceneManifest adicionado ao Info.plist.');
    plistChanged = true;
  }

  if (!entries.CFBundleDisplayName || entries.CFBundleDisplayName === 'My App') {
    entries.CFBundleDisplayName = 'Labprox';
    plistChanged = true;
  }

  const requiredIpadOrientations = [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ];
  if (!Array.isArray(entries['UISupportedInterfaceOrientations~ipad']) || entries['UISupportedInterfaceOrientations~ipad'].length < 4) {
    entries['UISupportedInterfaceOrientations~ipad'] = requiredIpadOrientations;
    plistChanged = true;
  }

  const requiredUsageDescriptions = {
    NSCameraUsageDescription: 'O Labprox utiliza a câmera para ler códigos de barras/QR codes e capturar fotos de casos odontológicos.',
    NSPhotoLibraryUsageDescription: 'O Labprox utiliza a biblioteca de fotos para anexar imagens aos casos e pedidos.',
    NSPhotoLibraryAddUsageDescription: 'O Labprox salva fotos capturadas dos casos odontológicos na sua galeria quando solicitado.',
    NFCReaderUsageDescription: 'O Labprox utiliza o leitor NFC para identificar e rastrear caixas e ordens de serviço por aproximação.',
  };
  for (const [key, defaultText] of Object.entries(requiredUsageDescriptions)) {
    if (!entries[key]) {
      entries[key] = defaultText;
      plistChanged = true;
    }
  }

  if (plistChanged) {
    fs.writeFileSync(infoPlistPath, plist.build(entries), 'utf-8');
    console.log('[Labprox iOS] Info.plist atualizado.');
    changes++;
  }
}

// 5. Ensure Podfile uses iOS 15.0 minimum target for Capacitor 8
if (fs.existsSync(podfilePath)) {
  const podfile = fs.readFileSync(podfilePath, 'utf-8');
  const updatedPodfile = podfile.replace(
    /platform\s+:ios,\s*'(\d+(?:\.\d+)?)'/,
    (full, ver) => (parseFloat(ver) < 15.0 ? "platform :ios, '15.0'" : full)
  );
  if (updatedPodfile !== podfile) {
    fs.writeFileSync(podfilePath, updatedPodfile, 'utf-8');
    console.log('[Labprox iOS] Podfile atualizado para platform :ios, \'15.0\'.');
    changes++;
  }
}

if (changes === 0) {
  console.log('[Labprox iOS] Projeto iOS já está em conformidade com UIScene lifecycle e Capacitor 8.');
}

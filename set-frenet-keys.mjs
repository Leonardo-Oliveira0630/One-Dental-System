import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqvqRSt06s2Dh09fYiFsw4zTA598bmwlU",
  authDomain: "one-dental-system.firebaseapp.com",
  projectId: "one-dental-system",
  appId: "1:963023434254:web:5e5513ea9de1676aa7825f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para fazer parse dos argumentos da linha de comando (ex: --token "XYZ" --cep "01001000")
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextVal = args[i + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        parsed[key] = nextVal;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

function maskKey(key) {
  if (!key) return '(não configurado)';
  if (key.length <= 8) return '********';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

async function run() {
  const flags = parseArgs();

  console.log('\n========================================================');
  console.log('📦 LABPROX • GERENCIADOR DE CHAVES FRENET (BACKEND)');
  console.log('========================================================\n');

  // Modo de visualização de status
  if (flags.show || flags.status || flags.list) {
    try {
      const targetDoc = flags.orgId ? doc(db, 'organizations', flags.orgId) : doc(db, 'settings', 'global');
      const snap = await getDoc(targetDoc);
      const data = snap.exists() ? snap.data() : {};

      console.log(`📍 Destino: ${flags.orgId ? `Organização ID [${flags.orgId}]` : 'Configuração Global do Sistema (settings/global)'}`);
      console.log('--------------------------------------------------------');
      console.log(`🔑 Token Frenet:       ${maskKey(data.frenetToken || data.frenet_token)}`);
      console.log(`📫 CEP de Origem:      ${data.frenetOriginCep || data.frenetCep || data.cep || '(não configurado)'}`);
      console.log(`👤 Usuário/Login:      ${data.frenetUser || '(não configurado)'}`);
      console.log(`🔒 Senha/Key:          ${data.frenetPassword ? '********' : '(não configurado)'}`);
      console.log('--------------------------------------------------------\n');
      process.exit(0);
    } catch (e) {
      console.error('❌ Erro ao consultar chaves do backend:', e.message);
      process.exit(1);
    }
  }

  // Se nenhum argumento for passado, exibe instrução de uso
  const token = flags.token || flags.key || flags.t;
  const cep = flags.cep || flags.originCep || flags.origin_cep;
  const password = flags.password || flags.senha || flags.p;
  const user = flags.user || flags.usuario || flags.u;
  const orgId = flags.orgId || flags.org;

  if (!token && !cep && !password && !user && !flags.clear) {
    console.log('ℹ️  COMO USAR:');
    console.log('   node set-frenet-keys.mjs --token "SEU_TOKEN_FRENET" --cep "01001000"');
    console.log('   node set-frenet-keys.mjs --token "TOKEN" --cep "01001000" --password "SENHA" --user "EMAIL"');
    console.log('   node set-frenet-keys.mjs --show                 (Para ver as chaves atuais)');
    console.log('   node set-frenet-keys.mjs --orgId "ID_DA_ORG" --token "TOKEN" (Para salvar em um Lab/Fornecedor específico)\n');
    console.log('💡 PARÂMETROS DISPONÍVEIS:');
    console.log('   --token <string>    : Token de Acesso da Frenet gerado no painel da Frenet');
    console.log('   --cep <string>      : CEP padrão do remetente (apenas números ou formatado)');
    console.log('   --password <string> : Senha / Chave secreta da API Frenet (opcional)');
    console.log('   --user <string>     : Usuário / Email Frenet (opcional)');
    console.log('   --orgId <string>    : ID da organização (se omitido, salva nas configurações globais do backend)');
    console.log('   --show              : Exibe o status atual das chaves no backend (com máscara de segurança)');
    console.log('   --clear             : Remove as chaves do backend\n');
    process.exit(0);
  }

  try {
    const targetRef = orgId ? doc(db, 'organizations', orgId) : doc(db, 'settings', 'global');
    
    if (flags.clear) {
      const clearData = {
        frenetToken: '',
        frenetOriginCep: '',
        frenetPassword: '',
        frenetUser: '',
        updatedAt: new Date()
      };
      await setDoc(targetRef, clearData, { merge: true });
      console.log('✅ Chaves da Frenet removidas com sucesso do backend!');
      process.exit(0);
    }

    const payloadToSave = {
      updatedAt: new Date()
    };

    if (token) payloadToSave.frenetToken = String(token).trim();
    if (cep) payloadToSave.frenetOriginCep = String(cep).replace(/\D/g, '').trim();
    if (password) payloadToSave.frenetPassword = String(password).trim();
    if (user) payloadToSave.frenetUser = String(user).trim();

    await setDoc(targetRef, payloadToSave, { merge: true });

    console.log('✅ CHAVES SALVAS COM SUCESSO NO BACKEND!');
    console.log('--------------------------------------------------------');
    console.log(`📍 Armazenado em:       ${orgId ? `organizations/${orgId}` : 'settings/global (Backend Cloud)'}`);
    if (token) console.log(`🔑 Token Frenet:         ${maskKey(payloadToSave.frenetToken)}`);
    if (cep)   console.log(`📫 CEP de Origem:        ${payloadToSave.frenetOriginCep}`);
    if (user)  console.log(`👤 Usuário:              ${payloadToSave.frenetUser}`);
    if (password) console.log(`🔒 Senha:                ********`);
    console.log('--------------------------------------------------------');
    console.log('🚀 As Cloud Functions e rotas de cálculo de frete já estão');
    console.log('   utilizando estas credenciais de forma 100% segura!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO ao gravar chaves no backend:', err.message);
    process.exit(1);
  }
}

run();

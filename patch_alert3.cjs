const fs = require('fs');
let code = fs.readFileSync('context/AppContext.tsx', 'utf8');

const newEffect = `
  // Monitoramento de Alertas Agendados
  useEffect(() => {
    if (!currentUser || alerts.length === 0) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      
      const alert = alerts.find(a => {
        // Ignorar se já foi lido por este usuário
        if (a.readBy && a.readBy.includes(currentUser.id)) return false;
        
        // Ignorar se a data agendada for no futuro
        if (!a.scheduledFor) return false;
        const scheduledTime = a.scheduledFor instanceof Date ? a.scheduledFor.getTime() : new Date(a.scheduledFor).getTime();
        if (scheduledTime > now.getTime()) return false;
        
        // Regras de direcionamento (target)
        // 1. Se tem targetUserId, só exibe se o targetUserId == currentUser.id
        if (a.targetUserId && a.targetUserId !== currentUser.id) return false;
        
        // 2. Se tem targetSector, só exibe se o targetSector == currentUser.sector
        if (a.targetSector && a.targetSector !== currentUser.sector) return false;
        
        // Se não tem targetUserId nem targetSector, então é geral para toda a org, pode exibir.
        // Ou se tiver targetUserId e for do currentUser
        // Ou se tiver targetSector e for do setor do currentUser
        return true;
      });

      if (alert && (!activeAlert || activeAlert.id !== alert.id)) {
        setActiveAlert(alert);
      }
    }, 5000); // Verifica a cada 5 segundos
    
    return () => clearInterval(interval);
  }, [alerts, currentUser, activeAlert]);

  // Optimized Automatic Blocking Logic
`;

code = code.replace(/\/\/ Optimized Automatic Blocking Logic/, newEffect);

fs.writeFileSync('context/AppContext.tsx', code);
console.log("Patched AppContext.tsx alerts");

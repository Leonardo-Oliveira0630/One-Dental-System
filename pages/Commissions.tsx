
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { UserRole, CommissionStatus, Job } from '../types';
import { DollarSign, CheckCircle, Clock, Calendar, User, Search, Filter, Download, FileText, FileSpreadsheet, Users, Layers, Trash2, RefreshCw, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateItemCommission } from '../utils/commissionUtils';

export const parseSafeDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (val?.toDate && typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (val?.seconds !== undefined) {
    const d = new Date(val.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

interface EnrichedItemExecutionDetail {
  serviceTypeName: string;
  stagesExecuted: string[];
  isBaseOnly: boolean;
  quantity: number;
}

interface EnrichedCommission {
  id: string;
  ids: string[];
  createdAt: Date;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  serviceTypeName?: string;
  stageName?: string;
  serviceTypes: string;
  executedDetails: EnrichedItemExecutionDetail[];
  quantity: number;
  sector: string;
  amount: number;
  status: CommissionStatus;
}

export const Commissions = () => {
  const { t } = useTranslation();
  const { commissions, currentUser, updateCommissionStatus, deleteCommissionRecord, allUsers, jobs, activeOrganization, jobTypes, commissionGroups, addCommissionRecord, updateCommissionRecord } = useApp();
  const [filterUser, setFilterUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [consolidateByJob, setConsolidateByJob] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Sync Modal States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStartDate, setSyncStartDate] = useState('2026-10-21');
  const [syncEndDate, setSyncEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  const handleSyncCommissions = async () => {
    setIsSyncing(true);
    setSyncResultMsg(null);
    try {
      const start = new Date(`${syncStartDate}T00:00:00`);
      const end = new Date(`${syncEndDate}T23:59:59`);

      let createdCount = 0;
      let updatedCount = 0;
      let totalValueSynced = 0;

      interface BillableUnit {
        jobId: string;
        osNumber: string;
        patientName: string;
        userId: string;
        userName: string;
        sector: string;
        itemId: string;
        itemName: string;
        stageName: string;
        quantity: number;
        amount: number;
        createdAt: Date;
      }

      const billableUnits: BillableUnit[] = [];

      // Analisa TODOS os trabalhos do laboratório (sem filtrar por job.createdAt, pois a OS pode ser de data anterior e a saída ter ocorrido no período!)
      for (const job of jobs) {
        if (!job) continue;

        const hasItemExecs = job.itemExecutions && job.itemExecutions.length > 0;

        (job.items || []).forEach((item: any) => {
          if (item.commissionDisabled) return;

          const jt = jobTypes.find(t => t.id === item.jobTypeId);
          const executions = (job.itemExecutions || []).filter((e: any) => e.itemId === item.id || (!e.itemId && e.sector));

          if (executions.length > 0) {
            executions.forEach((exec: any) => {
              const sec = exec.sector || 'Geral';
              if (item.sectorCommissionDisabled?.[sec]) return;

              const secQty = (item.sectorQuantities && sec && item.sectorQuantities[sec] !== undefined)
                ? Number(item.sectorQuantities[sec])
                : Number(item.quantity) || 1;

              // 1. Verificar etapas específicas executadas
              const stageNames = new Set<string>();
              (exec.executedStages || []).forEach((s: string) => stageNames.add(s));
              if (exec.stageTimes) {
                Object.keys(exec.stageTimes).forEach((s: string) => {
                  if (s !== 'BASE') stageNames.add(s);
                });
              }

              if (stageNames.size > 0) {
                stageNames.forEach((stg: string) => {
                  const stData = exec.stageTimes?.[stg];
                  const uid = stData?.exitUserId || stData?.entryUserId || exec.userId;
                  if (!uid) return;
                  const userObj = allUsers.find(u => u.id === uid);
                  if (!userObj) return;

                  // Extrair data exata de saída da etapa
                  let exitDate = parseSafeDate(stData?.exitTime) || 
                                 parseSafeDate(stData?.entryTime) || 
                                 parseSafeDate(exec.exitTime) || 
                                 parseSafeDate(exec.timestamp);

                  if (!exitDate) {
                    const mov = (job.sectorMovements || []).find((m: any) => m.sector === sec && (m.exitUserId === uid || m.entryUserId === uid));
                    if (mov) exitDate = parseSafeDate(mov.exitTime) || parseSafeDate(mov.entryTime);
                  }
                  if (!exitDate) {
                    const hist = (job.history || []).slice().reverse().find((h: any) => h.userId === uid && (h.sector === sec || h.action?.includes(stg)));
                    if (hist) exitDate = parseSafeDate(hist.timestamp);
                  }
                  if (!exitDate) {
                    exitDate = parseSafeDate(job.createdAt) || new Date();
                  }

                  // Verifica se a saída do colaborador ocorreu dentro do período de sincronização
                  if (exitDate >= start && exitDate <= end) {
                    let stageQty = secQty;
                    if (sec && item.stageQuantities?.[sec]?.[stg] !== undefined) {
                      const customQty = Number(item.stageQuantities[sec][stg]);
                      if (!isNaN(customQty) && customQty > 0) {
                        stageQty = (customQty === 1 && secQty > 1) ? secQty : customQty;
                      }
                    }

                    const stgComm = calculateItemCommission(item, jt, userObj, secQty, sec, [stg], false, commissionGroups);
                    if (stgComm > 0) {
                      billableUnits.push({
                        jobId: job.id,
                        osNumber: job.osNumber || 'N/A',
                        patientName: job.patientName,
                        userId: uid,
                        userName: userObj.name || '',
                        sector: sec,
                        itemId: item.id,
                        itemName: item.name,
                        stageName: stg,
                        quantity: stageQty,
                        amount: stgComm,
                        createdAt: exitDate
                      });
                    }
                  }
                });
              }

              // 2. Verificar produção base executada (quando não há sub-etapas ou quando BASE é explicitamente registrado)
              const baseData = exec.stageTimes?.['BASE'];
              const isBaseProduction = !!baseData || (stageNames.size === 0 && exec.isBaseChecked !== false);
              if (isBaseProduction) {
                const uid = baseData?.exitUserId || baseData?.entryUserId || exec.userId;
                if (uid) {
                  const userObj = allUsers.find(u => u.id === uid);
                  if (userObj) {
                    let exitDate = parseSafeDate(baseData?.exitTime) || 
                                   parseSafeDate(baseData?.entryTime) || 
                                   parseSafeDate(exec.exitTime) || 
                                   parseSafeDate(exec.timestamp);

                    if (!exitDate) {
                      const mov = (job.sectorMovements || []).find((m: any) => m.sector === sec && (m.exitUserId === uid || m.entryUserId === uid));
                      if (mov) exitDate = parseSafeDate(mov.exitTime) || parseSafeDate(mov.entryTime);
                    }
                    if (!exitDate) {
                      const hist = (job.history || []).slice().reverse().find((h: any) => h.userId === uid && h.sector === sec);
                      if (hist) exitDate = parseSafeDate(hist.timestamp);
                    }
                    if (!exitDate) {
                      exitDate = parseSafeDate(job.createdAt) || new Date();
                    }

                    if (exitDate >= start && exitDate <= end) {
                      const baseComm = calculateItemCommission(item, jt, userObj, secQty, sec, [], true, commissionGroups);
                      if (baseComm > 0) {
                        billableUnits.push({
                          jobId: job.id,
                          osNumber: job.osNumber || 'N/A',
                          patientName: job.patientName,
                          userId: uid,
                          userName: userObj.name || '',
                          sector: sec,
                          itemId: item.id,
                          itemName: item.name,
                          stageName: 'Produção Base',
                          quantity: secQty,
                          amount: baseComm,
                          createdAt: exitDate
                        });
                      }
                    }
                  }
                }
              }
            });
          } else if (!hasItemExecs && job.sectorMovements && job.sectorMovements.length > 0) {
            // Caso legado sem itemExecutions: verificar saídas registradas em sectorMovements
            job.sectorMovements.forEach((mov: any) => {
              const sec = mov.sector || 'Geral';
              if (item.sectorCommissionDisabled?.[sec]) return;
              const uid = mov.exitUserId || mov.entryUserId;
              if (!uid) return;
              const userObj = allUsers.find(u => u.id === uid);
              if (!userObj) return;

              const exitDate = parseSafeDate(mov.exitTime) || parseSafeDate(mov.entryTime) || parseSafeDate(job.createdAt);
              if (exitDate && exitDate >= start && exitDate <= end) {
                const secQty = (item.sectorQuantities && item.sectorQuantities[sec] !== undefined)
                  ? Number(item.sectorQuantities[sec])
                  : Number(item.quantity) || 1;
                const baseComm = calculateItemCommission(item, jt, userObj, secQty, sec, [], true, commissionGroups);
                if (baseComm > 0) {
                  billableUnits.push({
                    jobId: job.id,
                    osNumber: job.osNumber || 'N/A',
                    patientName: job.patientName,
                    userId: uid,
                    userName: userObj.name || '',
                    sector: sec,
                    itemId: item.id,
                    itemName: item.name,
                    stageName: 'Produção Base',
                    quantity: secQty,
                    amount: baseComm,
                    createdAt: exitDate
                  });
                }
              }
            });
          }
        });
      }

      // Cópia de trabalho em memória para rastrear atualizações e novas inserções no mesmo ciclo
      // Isso impede que múltiplos lançamentos da mesma OS colidam ou sobrescrevam registros em lote!
      const workingCommissions: CommissionRecord[] = [...commissions];
      const usedLegacyRecordIds = new Set<string>();
      const processedUnitKeys = new Set<string>();

      // Faturar/persistir cada unidade de serviço ou etapa encontrada
      for (const unit of billableUnits) {
        const unitKey = `${unit.jobId}_${unit.userId}_${unit.itemId}_${unit.stageName}`;
        if (processedUnitKeys.has(unitKey)) {
          continue; // Já processado nesta rodada
        }
        processedUnitKeys.add(unitKey);

        // 1. Procurar correspondência exata por item e etapa
        const exactMatchIndex = workingCommissions.findIndex(c => 
          c.jobId === unit.jobId && 
          c.userId === unit.userId && 
          c.itemId === unit.itemId && 
          (c.stageName === unit.stageName || (!c.stageName && unit.stageName === 'Produção Base'))
        );

        if (exactMatchIndex !== -1) {
          const existing = workingCommissions[exactMatchIndex];
          // Nunca alterar lançamentos já pagos!
          if (existing.status === CommissionStatus.PENDING) {
            const existingTime = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
            const newTime = unit.createdAt.getTime();
            const needsUpdate = 
              Math.abs((existing.amount || 0) - unit.amount) > 0.01 || 
              Math.abs(existingTime - newTime) > 60000 ||
              existing.stageName !== unit.stageName ||
              existing.itemId !== unit.itemId ||
              existing.quantity !== unit.quantity;

            if (needsUpdate) {
              const updatedFields = {
                amount: unit.amount,
                createdAt: unit.createdAt, // Data exata de saída da etapa!
                quantity: unit.quantity,
                itemId: unit.itemId,
                itemName: unit.itemName,
                stageName: unit.stageName,
                sector: unit.sector
              };
              await updateCommissionRecord(existing.id, updatedFields);
              workingCommissions[exactMatchIndex] = { ...existing, ...updatedFields };
              updatedCount++;
            }
          }
        } else {
          // 2. Procurar registro legado pendente do mesmo trabalho/usuário que ainda não tenha sido reaproveitado
          const legacyIndex = workingCommissions.findIndex(c => 
            c.jobId === unit.jobId && 
            c.userId === unit.userId && 
            c.sector === unit.sector && 
            c.status === CommissionStatus.PENDING && 
            !c.itemId &&
            !usedLegacyRecordIds.has(c.id)
          );

          if (legacyIndex !== -1) {
            const legacyRecord = workingCommissions[legacyIndex];
            usedLegacyRecordIds.add(legacyRecord.id); // Marca como utilizado para NÃO sobrescrever múltiplos itens no mesmo registro!

            const updatedFields = {
              amount: unit.amount,
              createdAt: unit.createdAt,
              quantity: unit.quantity,
              itemId: unit.itemId,
              itemName: unit.itemName,
              stageName: unit.stageName,
              sector: unit.sector
            };
            await updateCommissionRecord(legacyRecord.id, updatedFields);
            workingCommissions[legacyIndex] = { ...legacyRecord, ...updatedFields };
            updatedCount++;
          } else {
            // 3. Criar novo registro detalhado de comissão
            const newId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newRecord: CommissionRecord = {
              id: newId,
              jobId: unit.jobId,
              osNumber: unit.osNumber,
              patientName: unit.patientName,
              sector: unit.sector,
              userId: unit.userId,
              userName: unit.userName,
              itemId: unit.itemId,
              itemName: unit.itemName,
              stageName: unit.stageName,
              quantity: unit.quantity,
              amount: unit.amount,
              status: CommissionStatus.PENDING,
              createdAt: unit.createdAt // Data exata de saída da etapa!
            };
            await addCommissionRecord(newRecord);
            workingCommissions.push(newRecord); // Imediatamente disponível para as próximas iterações do loop!
            createdCount++;
          }
        }
        totalValueSynced += unit.amount;
      }

      setSyncResultMsg(
        `Sincronização concluída com sucesso em rodada única!\n\n` +
        `• ${jobs.length} trabalhos analisados no laboratório.\n` +
        `• ${billableUnits.length} etapas/serviços com saída no período identificados.\n` +
        `• ${createdCount} novos lançamentos de comissão faturados.\n` +
        `• ${updatedCount} lançamentos existentes atualizados com a data correta de saída.`
      );
    } catch (err: any) {
      console.error(err);
      setSyncResultMsg(`Erro ao sincronizar comissões: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const isManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.SUPER_ADMIN || !!currentUser?.permissions?.includes('commissions:view');

  // Desmembrar e enriquecer dados de comissões por cada tipo de serviço ou etapa executada separadamente
  const enrichedCommissions: EnrichedCommission[] = useMemo(() => {
    // 1. Agrupar lançamentos por chave de consolidação ou individual
    const groupsMap = new Map<string, {
      ids: string[];
      comm: any;
      totalAmount: number;
      latestCreatedAt: Date;
      sectors: Set<string>;
      itemsDirect: { itemName?: string; stageName?: string; quantity?: number; itemId?: string; amount?: number }[];
    }>();

    commissions.forEach(comm => {
      const groupKey = (consolidateByJob && comm.jobId) 
        ? `${comm.jobId}_${comm.userId}_${comm.status}`
        : comm.id;

      const commDate = parseSafeDate(comm.createdAt) || new Date();
      const existing = groupsMap.get(groupKey);
      if (existing) {
        existing.ids.push(comm.id);
        existing.totalAmount += (comm.amount || 0);
        if (commDate > existing.latestCreatedAt) {
          existing.latestCreatedAt = commDate;
        }
        if (comm.sector) existing.sectors.add(comm.sector);
        if (comm.itemName || comm.stageName || comm.itemId) {
          existing.itemsDirect.push({ 
            itemId: comm.itemId, 
            itemName: comm.itemName, 
            stageName: comm.stageName, 
            quantity: comm.quantity,
            amount: comm.amount
          });
        }
      } else {
        const sectors = new Set<string>();
        if (comm.sector) sectors.add(comm.sector);
        groupsMap.set(groupKey, {
          ids: [comm.id],
          comm: comm,
          totalAmount: comm.amount || 0,
          latestCreatedAt: commDate,
          sectors: sectors,
          itemsDirect: (comm.itemName || comm.stageName || comm.itemId) 
            ? [{ 
                itemId: comm.itemId, 
                itemName: comm.itemName, 
                stageName: comm.stageName, 
                quantity: comm.quantity,
                amount: comm.amount
              }] 
            : []
        });
      }
    });

    const resultList: EnrichedCommission[] = [];

    // 2. Para cada grupo, extrair e desmembrar cada tipo de serviço / etapa em uma linha separada
    groupsMap.forEach(group => {
      const comm = group.comm;
      const job = jobs.find(j => j.id === comm.jobId);
      const user = allUsers.find(u => u.id === comm.userId);

      interface SubItem {
        serviceTypeName: string;
        stageName: string;
        quantity: number;
        calculatedAmount: number;
        sector: string;
        exitDate?: Date;
      }

      const subItems: SubItem[] = [];

      if (job && job.itemExecutions && job.itemExecutions.length > 0) {
        let userExecutions = job.itemExecutions.filter(
          (e: any) => e.userId === comm.userId || (e.stageTimes && Object.values(e.stageTimes).some((st: any) => st?.exitUserId === comm.userId || st?.entryUserId === comm.userId))
        );

        if (!consolidateByJob && group.ids.length === 1) {
          if (comm.itemId) {
            const matched = userExecutions.filter((e: any) => e.itemId === comm.itemId);
            if (matched.length > 0) userExecutions = matched;
          } else if (comm.sector) {
            const bySector = userExecutions.filter((e: any) => e.sector === comm.sector);
            if (bySector.length > 0) userExecutions = bySector;
          }
        }

        userExecutions.forEach((exec: any) => {
          const item = job.items?.find((i: any) => i.id === exec.itemId);
          if (!item || item.commissionDisabled) return;

          const sec = exec.sector || comm.sector || 'Geral';
          if (item.sectorCommissionDisabled?.[sec]) return;

          const secQty = (item.sectorQuantities && sec && item.sectorQuantities[sec] !== undefined)
            ? Number(item.sectorQuantities[sec])
            : Number(item.quantity) || 1;

          const jt = jobTypes.find(t => t.id === item.jobTypeId);

          let stagesForUser = exec.executedStages || [];
          if (exec.stageTimes) {
            stagesForUser = (exec.executedStages || []).filter((stg: string) => {
              const stData = exec.stageTimes?.[stg];
              if (stData?.exitUserId) return stData.exitUserId === comm.userId;
              return exec.userId === comm.userId;
            });
          }

          const isBaseForUser = (exec.isBaseChecked !== false) &&
            (!exec.stageTimes?.['BASE']?.exitUserId || exec.stageTimes?.['BASE']?.exitUserId === comm.userId || exec.userId === comm.userId);

          // Etapas executadas
          if (stagesForUser.length > 0) {
            stagesForUser.forEach((stg: string) => {
              let stageQty = secQty;
              if (sec && item.stageQuantities?.[sec]?.[stg] !== undefined) {
                const customQty = Number(item.stageQuantities[sec][stg]);
                if (!isNaN(customQty) && customQty > 0) {
                  stageQty = (customQty === 1 && secQty > 1) ? secQty : customQty;
                }
              }

              const stgAmt = user ? calculateItemCommission(
                item, jt, user, secQty, sec, [stg], false, commissionGroups
              ) : 0;

              const stData = exec.stageTimes?.[stg];
              const stExitDate = parseSafeDate(stData?.exitTime) || parseSafeDate(stData?.entryTime) || parseSafeDate(exec.exitTime) || parseSafeDate(exec.timestamp);

              subItems.push({
                serviceTypeName: item.name,
                stageName: stg,
                quantity: stageQty,
                calculatedAmount: stgAmt,
                sector: sec,
                exitDate: stExitDate || undefined
              });
            });
          }

          // Serviço Base executado
          if (isBaseForUser) {
            const fullWithBase = user ? calculateItemCommission(
              item, jt, user, secQty, sec, stagesForUser, true, commissionGroups
            ) : 0;
            const fullWithoutBase = user ? calculateItemCommission(
              item, jt, user, secQty, sec, stagesForUser, false, commissionGroups
            ) : 0;
            const baseAmt = Math.max(0, fullWithBase - fullWithoutBase);

            const baseData = exec.stageTimes?.['BASE'];
            const baseExitDate = parseSafeDate(baseData?.exitTime) || parseSafeDate(baseData?.entryTime) || parseSafeDate(exec.exitTime) || parseSafeDate(exec.timestamp);

            subItems.push({
              serviceTypeName: item.name,
              stageName: 'Produção Base',
              quantity: secQty,
              calculatedAmount: baseAmt,
              sector: sec,
              exitDate: baseExitDate || undefined
            });
          }
        });
      }

      // Fallback se não houver execuções detalhadas
      if (subItems.length === 0) {
        if (group.itemsDirect.length > 0) {
          group.itemsDirect.forEach(d => {
            subItems.push({
              serviceTypeName: d.itemName || 'Serviço',
              stageName: d.stageName || 'Produção Base',
              quantity: d.quantity || 1,
              calculatedAmount: d.amount || (group.totalAmount / group.itemsDirect.length),
              sector: comm.sector || 'Geral'
            });
          });
        } else if (comm.itemName || comm.stageName) {
          subItems.push({
            serviceTypeName: comm.itemName || 'Serviço',
            stageName: comm.stageName || 'Produção Base',
            quantity: comm.quantity || 1,
            calculatedAmount: group.totalAmount,
            sector: comm.sector || 'Geral'
          });
        } else if (job && job.items && job.items.length > 0) {
          const validItems = job.items.filter((i: any) => !i.commissionDisabled);
          const perItemAmt = group.totalAmount / (validItems.length || 1);
          validItems.forEach((i: any) => {
            subItems.push({
              serviceTypeName: i.name,
              stageName: 'Produção Base',
              quantity: i.quantity || 1,
              calculatedAmount: perItemAmt,
              sector: comm.sector || 'Geral'
            });
          });
        } else {
          subItems.push({
            serviceTypeName: 'Serviço',
            stageName: 'Produção Base',
            quantity: comm.quantity || 1,
            calculatedAmount: group.totalAmount,
            sector: comm.sector || 'Geral'
          });
        }
      }

      // Proporcionalizar os valores calculados para somar exatamente group.totalAmount
      const totalCalc = subItems.reduce((acc, s) => acc + s.calculatedAmount, 0);
      const targetAmount = group.totalAmount;

      const subItemsWithFinalAmount = subItems.map(s => {
        let finalAmt = 0;
        if (totalCalc > 0) {
          finalAmt = (s.calculatedAmount / totalCalc) * targetAmount;
        } else {
          finalAmt = targetAmount / subItems.length;
        }
        return {
          ...s,
          amount: Math.round(finalAmt * 100) / 100
        };
      });

      // Gerar um registro EnrichedCommission para cada item/etapa desmembrado
      subItemsWithFinalAmount.forEach((sub, idx) => {
        const stageText = sub.stageName && sub.stageName !== 'Produção Base' 
          ? `Etapa: ${sub.stageName}` 
          : 'Produção Base';
        const serviceTypesFormatted = `${sub.serviceTypeName} (${stageText})`;

        const exactRowDate = sub.exitDate || parseSafeDate(comm.createdAt) || group.latestCreatedAt || new Date();

        resultList.push({
          id: subItemsWithFinalAmount.length === 1 ? comm.id : `${comm.id}_${idx}`,
          ids: group.ids,
          userId: comm.userId,
          userName: comm.userName,
          jobId: comm.jobId,
          osNumber: comm.osNumber || (job?.osNumber || 'N/A'),
          patientName: comm.patientName || (job?.patientName || 'N/A'),
          dentistName: job?.dentistName || 'N/A',
          serviceTypeName: sub.serviceTypeName,
          stageName: sub.stageName,
          serviceTypes: serviceTypesFormatted,
          executedDetails: [{
            serviceTypeName: sub.serviceTypeName,
            stagesExecuted: sub.stageName !== 'Produção Base' ? [sub.stageName] : [],
            isBaseOnly: sub.stageName === 'Produção Base',
            quantity: sub.quantity
          }],
          quantity: sub.quantity,
          sector: sub.sector,
          amount: sub.amount,
          status: comm.status,
          createdAt: exactRowDate
        });
      });
    });

    return resultList;
  }, [commissions, jobs, allUsers, jobTypes, commissionGroups, consolidateByJob]);

  const handleMarkAsPaid = async (rec: EnrichedCommission) => {
    if (rec.ids && rec.ids.length > 0) {
      await Promise.all(rec.ids.map(id => updateCommissionStatus(id, CommissionStatus.PAID)));
    } else {
      await updateCommissionStatus(rec.id, CommissionStatus.PAID);
    }
  };

  const handleDeleteCommission = async (rec: EnrichedCommission) => {
    if (!window.confirm(t('commissions.confirmDelete', 'Tem certeza que deseja excluir este registro de comissão?'))) return;
    if (rec.ids && rec.ids.length > 0) {
      await Promise.all(rec.ids.map(id => deleteCommissionRecord(id)));
    } else {
      await deleteCommissionRecord(rec.id);
    }
  };

  // Filtragem
  const filteredCommissions = useMemo(() => {
    return enrichedCommissions.filter(c => {
      if (!isManager && c.userId !== currentUser?.id) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (filterUser && c.userId !== filterUser) return false;
      
      if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00`);
          if (c.createdAt < from) return false;
      }
      if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59`);
          if (c.createdAt > to) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [enrichedCommissions, isManager, currentUser, statusFilter, filterUser, dateFrom, dateTo]);

  const stats = {
    pending: filteredCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, curr) => acc + curr.amount, 0),
    paid: filteredCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0),
    total: filteredCommissions.reduce((acc, curr) => acc + curr.amount, 0),
    totalQuantity: filteredCommissions.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  };

  // Exportar para Excel (Geral)
  const exportToExcel = () => {
    const data = filteredCommissions.map(c => ({
      [t('commissions.excelDate', 'Data')]: c.createdAt.toLocaleDateString(),
      [t('commissions.excelTime', 'Hora')]: c.createdAt.toLocaleTimeString(),
      [t('commissions.excelCollaborator', 'Colaborador')]: c.userName,
      [t('commissions.excelOs', 'OS')]: c.osNumber,
      [t('commissions.excelPatient', 'Paciente')]: c.patientName,
      [t('commissions.excelDentist', 'Dentista')]: c.dentistName,
      [t('commissions.excelServiceAndStage', 'Serviço / Etapa Executada')]: c.serviceTypes,
      [t('commissions.excelQty', 'Qtd')]: c.quantity,
      [t('commissions.excelSector', 'Setor')]: c.sector,
      [t('commissions.excelAmount', 'Valor')]: c.amount,
      [t('commissions.excelStatus', 'Status')]: c.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comissões");
    XLSX.writeFile(wb, "Extrato_Comissoes.xlsx");
    setIsExportMenuOpen(false);
  };

  // Exportar para PDF (Geral ou Batch) - Sem a coluna de Status de Pagamento
  const exportToPDF = (mode: 'GENERAL' | 'BATCH') => {
    const doc = new jsPDF();

    const formatServicesForPdf = (c: EnrichedCommission) => {
      if (c.serviceTypeName) {
        const stg = c.stageName && c.stageName !== 'Produção Base' ? ` (${c.stageName})` : '';
        return `${c.serviceTypeName}${stg}`;
      }
      if (c.executedDetails && c.executedDetails.length > 0) {
        return c.executedDetails.map(d => {
          const stg = d.stagesExecuted.length > 0 ? ` (${d.stagesExecuted.join(', ')})` : '';
          return `${d.serviceTypeName}${stg}`;
        }).join('\n');
      }
      return c.serviceTypes;
    };

    if (mode === 'GENERAL') {
      doc.text(t('commissions.pdfGeneralTitle', "Extrato de Comissões - Geral"), 14, 15);
      doc.setFontSize(10);
      doc.text(`${t('commissions.pdfGeneratedAt', 'Gerado em:')} ${new Date().toLocaleString()}`, 14, 22);

      const tableData = filteredCommissions.map(c => [
        c.createdAt.toLocaleDateString(),
        c.userName,
        c.osNumber,
        c.patientName,
        c.dentistName,
        formatServicesForPdf(c),
        c.quantity,
        c.sector,
        `R$ ${c.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [[
          t('commissions.excelDate', 'Data'), 
          t('commissions.excelCollaborator', 'Colaborador'), 
          t('commissions.excelOs', 'OS'), 
          t('commissions.excelPatient', 'Paciente'), 
          t('commissions.excelDentist', 'Dentista'), 
          t('commissions.serviceAndStage', 'Serviço / Etapa Executada'), 
          t('commissions.excelQty', 'Qtd'), 
          t('commissions.excelSector', 'Setor'), 
          t('commissions.excelAmount', 'Valor')
        ]],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Totais
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      if (finalY + 20 > 275) {
          doc.addPage();
          finalY = 20;
      }
      doc.setFontSize(10);
      doc.text(`${t('commissions.totalPending', 'Total Pendente:')} R$ ${stats.pending.toFixed(2)}`, 14, finalY);
      doc.text(`${t('commissions.totalPaid', 'Total Pago:')} R$ ${stats.paid.toFixed(2)}`, 14, finalY + 5);
      doc.text(`${t('commissions.totalGeneral', 'Total Geral:')} R$ ${stats.total.toFixed(2)}`, 14, finalY + 10);

      doc.save(t('commissions.pdfGeneralFilename', "Comissoes_Geral.pdf"));
    } else if (mode === 'BATCH') {
      // Agrupar por usuário
      const grouped = filteredCommissions.reduce((acc, curr) => {
        if (!acc[curr.userId]) acc[curr.userId] = [];
        acc[curr.userId].push(curr);
        return acc;
      }, {} as Record<string, EnrichedCommission[]>);

      let isFirstPage = true;

      Object.entries(grouped).forEach(([userId, userCommissions]) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        const userName = userCommissions[0].userName;
        const userTotal = userCommissions.reduce((acc, c) => acc + c.amount, 0);
        const userPending = userCommissions.filter(c => c.status === CommissionStatus.PENDING).reduce((acc, c) => acc + c.amount, 0);
        const userPaid = userCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((acc, c) => acc + c.amount, 0);

        doc.setFontSize(16);
        doc.text(`${t('commissions.pdfExtratoUser', 'Extrato de Comissões:')} ${userName}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`${t('commissions.pdfGeneratedAt', 'Gerado em:')} ${new Date().toLocaleString()}`, 14, 22);

        const tableData = userCommissions.map(c => [
          c.createdAt.toLocaleDateString(),
          c.osNumber,
          c.patientName,
          c.dentistName,
          formatServicesForPdf(c),
          c.quantity,
          c.sector,
          `R$ ${c.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          head: [[
            t('commissions.excelDate', 'Data'), 
            t('commissions.excelOs', 'OS'), 
            t('commissions.excelPatient', 'Paciente'), 
            t('commissions.excelDentist', 'Dentista'), 
            t('commissions.serviceAndStage', 'Serviço / Etapa Executada'), 
            t('commissions.excelQty', 'Qtd'), 
            t('commissions.excelSector', 'Setor'), 
            t('commissions.excelAmount', 'Valor')
          ]],
          body: tableData,
          startY: 25,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY + 20 > 275) {
            doc.addPage();
            finalY = 20;
        }
        doc.setFontSize(10);
        doc.text(`${t('commissions.totalPending', 'Total Pendente:')} R$ ${userPending.toFixed(2)}`, 14, finalY);
        doc.text(`${t('commissions.totalPaid', 'Total Pago:')} R$ ${userPaid.toFixed(2)}`, 14, finalY + 5);
        doc.text(`${t('commissions.totalGeneral', 'Total Geral:')} R$ ${userTotal.toFixed(2)}`, 14, finalY + 10);
      });

      doc.save(t('commissions.pdfBatchFilename', "Comissoes_Por_Funcionario.pdf"));
    }
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('commissions.title', 'Extrato de Comissões')}</h1>
          <p className="text-slate-500">{t('commissions.subtitle', 'Relatório de ganhos por produção e produtividade.')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <button
              onClick={() => {
                setSyncResultMsg(null);
                setShowSyncModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm active:scale-95 transition-all text-sm cursor-pointer"
              title="Analisar trabalhos e recalcular comissões do período"
            >
              <RefreshCw size={18} /> Sincronizar Comissões
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm cursor-pointer"
            >
              <Download size={18} /> {t('commissions.export', 'Exportar Relatório')}
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <button onClick={exportToExcel} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                  <FileSpreadsheet size={16} className="text-green-600" /> {t('commissions.exportExcel', 'Excel (Geral)')}
                </button>
                <button onClick={() => exportToPDF('GENERAL')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                  <FileText size={16} className="text-red-600" /> {t('commissions.exportPdf', 'PDF (Geral)')}
                </button>
                <button onClick={() => exportToPDF('BATCH')} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 border-t border-slate-100 cursor-pointer">
                  <Users size={16} className="text-blue-600" /> {t('commissions.exportByEmployee', 'PDF (Por Funcionário)')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">{t('commissions.totalQuantityProduced', 'Qtd Produzida Total')}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-600">{stats.totalQuantity} <span className="text-xs font-semibold text-slate-400">unid</span></h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">{t('commissions.pendingAmount', 'A Receber')}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-orange-600">R$ {stats.pending.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">{t('commissions.paidAmount', 'Pago (Acumulado)')}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-green-600">R$ {stats.paid.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1 uppercase">{t('commissions.totalAmount', 'Total Período')}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-600">R$ {stats.total.toFixed(2)}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
          {isManager && (
              <div className="flex-1 relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <select 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none bg-white appearance-none"
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                  >
                    <option value="">{t('commissions.allTechnicians', 'Todos os Colaboradores')}</option>
                    {allUsers
                      .filter(u => u.role !== UserRole.CLIENT)
                      .map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))
                    }
                  </select>
              </div>
          )}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
            <select 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-white outline-none font-medium appearance-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
                <option value="ALL">{t('commissions.allStatuses', 'Todos os Status')}</option>
                <option value={CommissionStatus.PENDING}>{t('commissions.statusPending', 'Pendente')}</option>
                <option value={CommissionStatus.PAID}>{t('commissions.statusPaid', 'Pago')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white font-medium text-slate-600 text-sm w-full md:w-auto"
            />
            <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white font-medium text-slate-600 text-sm w-full md:w-auto"
            />
          </div>

          <button
            type="button"
            onClick={() => setConsolidateByJob(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-colors ${
              consolidateByJob 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title={consolidateByJob ? t('commissions.consolidatedTitle', 'Visualizando consolidado por OS (Evita pagamentos divididos)') : t('commissions.detailedTitle', 'Visualizando lançamentos individuais')}
          >
            <Layers size={18} className={consolidateByJob ? 'text-blue-600' : 'text-slate-400'} />
            <span className="whitespace-nowrap">
              {consolidateByJob ? t('commissions.consolidatedView', 'Consolidado por OS') : t('commissions.detailedView', 'Lançamentos Detalhados')}
            </span>
          </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                        <th className="p-4">{t('commissions.date', 'Data')}</th>
                        <th className="p-4">{t('commissions.technician', 'Colaborador')}</th>
                        <th className="p-4">{t('commissions.jobDetails', 'Detalhes do Trabalho')}</th>
                        <th className="p-4">{t('commissions.serviceAndStage', 'Serviço / Etapa Executada')}</th>
                        <th className="p-4">{t('commissions.sector', 'Setor')}</th>
                        <th className="p-4 text-right">{t('commissions.amount', 'Valor')}</th>
                        <th className="p-4">{t('commissions.status', 'Status')}</th>
                        {isManager && <th className="p-4 text-center">{t('common.actions', 'Ações')}</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCommissions.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                                <div className="flex items-center gap-1 font-medium">{rec.createdAt.toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">{rec.createdAt.toLocaleTimeString()}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{rec.userName}</div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="font-mono font-bold text-blue-600 text-xs">{rec.osNumber}</span>
                                  <span className="text-sm font-medium text-slate-900">{rec.patientName}</span>
                                  <span className="text-[10px] text-slate-500 uppercase">Dr. {rec.dentistName}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                {rec.executedDetails && rec.executedDetails.length > 0 ? (
                                  <div className="flex flex-col gap-2.5">
                                    {rec.executedDetails.map((detail, idx) => (
                                      <div key={idx} className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 leading-tight">
                                          {detail.serviceTypeName}
                                        </span>
                                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md mt-1 w-fit border border-blue-100">
                                          {detail.stagesExecuted && detail.stagesExecuted.length > 0
                                            ? `Etapa${detail.stagesExecuted.length > 1 ? 's' : ''}: ${detail.stagesExecuted.join(', ')}`
                                            : 'Etapa: Produção Base'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                          {t('commissions.quantity', 'Qtd')}: {detail.quantity}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800" title={rec.serviceTypes}>{rec.serviceTypes}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{t('commissions.quantity', 'Qtd')}: {rec.quantity}</span>
                                  </div>
                                )}
                            </td>
                            <td className="p-4">
                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 uppercase">{rec.sector}</span>
                            </td>
                            <td className="p-4 text-right font-black text-slate-800 whitespace-nowrap">R$ {rec.amount.toFixed(2)}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${rec.status === CommissionStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {rec.status === CommissionStatus.PAID ? t('commissions.statusPaid', 'PAGO') : t('commissions.statusPending', 'PENDENTE')}
                                </span>
                            </td>
                            {isManager && (
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {rec.status === CommissionStatus.PENDING && (
                                          <button 
                                              onClick={() => handleMarkAsPaid(rec)}
                                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                              title={t('commissions.markAsPaid', 'Marcar como Pago')}
                                          >
                                              <CheckCircle size={20} />
                                          </button>
                                      )}
                                      <button
                                          onClick={() => handleDeleteCommission(rec)}
                                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title={t('common.delete', 'Excluir')}
                                      >
                                          <Trash2 size={18} />
                                      </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                    {filteredCommissions.length === 0 && (
                        <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic">{t('commissions.empty', 'Nenhum registro de comissão encontrado.')}</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL DE SINCRONIZAÇÃO DE COMISSÕES */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Sincronizar Comissões do Período</h3>
                  <p className="text-xs text-slate-500 font-medium">Recalcula e gera lançamentos de comissão para os colaboradores</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSyncModal(false)}
                disabled={isSyncing}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>Instrução de Re-sincronização</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Esta ferramenta analisa todos os trabalhos executados no período selecionado e recalcula com segurança as comissões devidas de cada colaborador. Nenhum histórico existente é apagado.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data Inicial</label>
                <input 
                  type="date"
                  value={syncStartDate}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  disabled={isSyncing}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data Final</label>
                <input 
                  type="date"
                  value={syncEndDate}
                  onChange={(e) => setSyncEndDate(e.target.value)}
                  disabled={isSyncing}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {syncResultMsg && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono whitespace-pre-line text-slate-800 animate-in fade-in duration-200">
                {syncResultMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight transition cursor-pointer"
              >
                {syncResultMsg ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleSyncCommissions}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-tight shadow-md flex items-center gap-2 active:scale-95 transition cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Iniciar Sincronização
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

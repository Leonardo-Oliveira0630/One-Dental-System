import { JobItem, JobType, User } from '../types';

export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number
): number => {
    if (!jobType) return 0;

    let variationComm = 0;
    if (item.selectedVariationIds && jobType.variationGroups) {
        jobType.variationGroups.forEach(group => {
            group.options.forEach(opt => {
                if (item.selectedVariationIds.includes(opt.id) && opt.commissionValue) {
                    variationComm += opt.commissionValue;
                }
            });
        });
    }

    const setting = user?.commissionSettings?.find((s: any) => s.jobTypeId === item.jobTypeId);
    
    if (setting) {
        if (setting.type === 'FIXED') {
            return (setting.value + variationComm) * secQty;
        } else {
            // Se for porcentagem, já incide sobre o item.price que contém o acréscimo das variações.
            // Para mantermos consistência, a comissão extra da variação também é adicionada como bônus fixo.
            return ((item.price * (setting.value / 100)) + variationComm) * secQty;
        }
    } else {
        const base = jobType.baseCommission || 0;
        return (base + variationComm) * secQty;
    }
};

import { JobItem, JobType } from '../types';

export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number,
    sectorName?: string,
    executedStages?: string[],
    includeBaseCommission: boolean = true
): number => {
    if (!jobType) return 0;

    const setting = user?.commissionSettings?.find((s: any) => s.jobTypeId === item.jobTypeId);

    // 1. Check if executed stages have specific commission settings for this user
    let stageCommissionTotal = 0;
    let hasStageCommission = false;

    if (setting?.stageSettings && sectorName) {
        // If executedStages is defined, use it. If not defined but sector has stages, fallback to checking all stages or executedStages
        const stagesToCheck = executedStages !== undefined
            ? executedStages
            : (item.sectorStages?.[sectorName] || jobType.sectorStages?.[sectorName] || []);

        if (stagesToCheck.length > 0) {
            stagesToCheck.forEach((stageName: string) => {
                const stageKey = `${sectorName}:${stageName}`;
                const stSetting = setting.stageSettings[stageKey];
                if (stSetting && stSetting.value !== undefined) {
                    hasStageCommission = true;
                    if (stSetting.type === 'FIXED') {
                        stageCommissionTotal += stSetting.value;
                    } else {
                        stageCommissionTotal += (item.price * (stSetting.value / 100));
                    }
                }
            });
        }
    }

    let finalCommission = 0;
    if (hasStageCommission) {
        finalCommission += stageCommissionTotal * secQty;
    }

    if (!includeBaseCommission) {
        return finalCommission;
    }

    // 2. Check if any selected variation has a user-specific setting
    let variationOverrideValue = 0;
    let hasVariationOverride = false;

    if (setting?.variationSettings && item.selectedVariationIds) {
        item.selectedVariationIds.forEach(vid => {
            const vSetting = setting.variationSettings[vid];
            if (vSetting) {
                hasVariationOverride = true;
                if (vSetting.type === 'FIXED') {
                    variationOverrideValue += vSetting.value;
                } else {
                    variationOverrideValue += (item.price * (vSetting.value / 100));
                }
            }
        });
    }

    // If the user has specific commission settings for the variations, they OVERRIDE the root commission
    if (hasVariationOverride) {
        return finalCommission + (variationOverrideValue * secQty);
    }

    // 3. Fallback to root user setting
    if (setting && setting.value !== undefined) {
        if (setting.type === 'FIXED') {
            return finalCommission + (setting.value * secQty);
        } else {
            return finalCommission + ((item.price * (setting.value / 100)) * secQty);
        }
    } 

    // 4. Fallback to JobType global baseCommission
    const base = jobType.baseCommission || 0;
    return finalCommission + (base * secQty);
};

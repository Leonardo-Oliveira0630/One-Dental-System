import { JobItem, JobType, CommissionGroup, UserCommissionSetting } from '../types';

export const getUserEffectiveCommissionSettings = (
    user: any,
    commissionGroups?: CommissionGroup[]
): UserCommissionSetting[] => {
    if (!user) return [];
    if (user.commissionGroupId && commissionGroups && commissionGroups.length > 0) {
        const group = commissionGroups.find(g => g.id === user.commissionGroupId);
        if (group && group.settings) {
            return group.settings;
        }
    }
    return user.commissionSettings || [];
};

export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number,
    sectorName?: string,
    executedStages?: string[],
    includeBaseCommission: boolean = true,
    commissionGroups?: CommissionGroup[]
): number => {
    if (!jobType) return 0;

    const settings = getUserEffectiveCommissionSettings(user, commissionGroups);
    const setting = settings.find((s: any) => s.jobTypeId === item.jobTypeId);

    // 1. Check if executed stages have specific commission settings for this user
    let stageCommissionTotal = 0;
    let hasStageCommission = false;
    const stageSettings = setting?.stageSettings;

    if (stageSettings && sectorName) {
        // If executedStages is defined, use it. If not defined but sector has stages, fallback to checking all stages or executedStages
        const stagesToCheck = executedStages !== undefined
            ? executedStages
            : (item.sectorStages?.[sectorName] || jobType.sectorStages?.[sectorName] || []);

        if (stagesToCheck.length > 0) {
            stagesToCheck.forEach((stageName: string) => {
                const stageKey = `${sectorName}:${stageName}`;
                const stSetting = stageSettings[stageKey];
                
                // Get stage quantity if defined, otherwise use sector quantity (e.g. 3 crowns = 3 stages)
                let stageQty = secQty;
                if (item.stageQuantities && item.stageQuantities[sectorName] && item.stageQuantities[sectorName][stageName] !== undefined) {
                    const customQty = Number(item.stageQuantities[sectorName][stageName]);
                    if (!isNaN(customQty) && customQty > 0) {
                        // If secQty > 1 and customQty was defaulted to 1 (legacy bug where stage was defaulted to 1 regardless of service quantity),
                        // use secQty so that 3 crowns = 3 stages executed
                        stageQty = (customQty === 1 && secQty > 1) ? secQty : customQty;
                    }
                }
                
                if (stSetting && stSetting.value !== undefined) {
                    hasStageCommission = true;
                    if (stSetting.type === 'FIXED') {
                        stageCommissionTotal += stSetting.value * stageQty;
                    } else {
                        stageCommissionTotal += (item.price * (stSetting.value / 100)) * stageQty;
                    }
                }
            });
        }
    }

    let finalCommission = 0;
    if (hasStageCommission) {
        finalCommission += stageCommissionTotal; // multiplied per-stage above
    }

    if (!includeBaseCommission) {
        return finalCommission;
    }

    // 2. Check if any selected variation has a user-specific setting
    let variationOverrideValue = 0;
    let hasVariationOverride = false;
    const variationSettings = setting?.variationSettings;

    if (variationSettings && item.selectedVariationIds) {
        item.selectedVariationIds.forEach(vid => {
            const vSetting = variationSettings[vid];
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

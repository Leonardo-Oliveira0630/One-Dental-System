import { JobItem, JobType } from '../types';

export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number
): number => {
    if (!jobType) return 0;

    const setting = user?.commissionSettings?.find((s: any) => s.jobTypeId === item.jobTypeId);
    
    // Check if any selected variation has a user-specific setting
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
        return variationOverrideValue * secQty;
    }

    // Fallback to root user setting
    if (setting && setting.value !== undefined) {
        if (setting.type === 'FIXED') {
            return setting.value * secQty;
        } else {
            return (item.price * (setting.value / 100)) * secQty;
        }
    } 
    
    // Fallback to JobType global baseCommission
    const base = jobType.baseCommission || 0;
    return base * secQty;
};

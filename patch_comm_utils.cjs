const fs = require('fs');

let content = fs.readFileSync('utils/commissionUtils.ts', 'utf8');

content = content.replace(
`export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number,
    sectorName?: string,
    executedStages?: string[]
): number => {`,
`export const calculateItemCommission = (
    item: JobItem,
    jobType: JobType | undefined,
    user: any,
    secQty: number,
    sectorName?: string,
    executedStages?: string[],
    includeBaseCommission: boolean = true
): number => {`
);

content = content.replace(
`    if (hasStageCommission) {
        return stageCommissionTotal * secQty;
    }`,
`    let finalCommission = 0;
    if (hasStageCommission) {
        finalCommission += stageCommissionTotal * secQty;
    }

    if (!includeBaseCommission) {
        return finalCommission;
    }`
);

content = content.replace(
`    // If the user has specific commission settings for the variations, they OVERRIDE the root commission
    if (hasVariationOverride) {
        return variationOverrideValue * secQty;
    }`,
`    // If the user has specific commission settings for the variations, they OVERRIDE the root commission
    if (hasVariationOverride) {
        return finalCommission + (variationOverrideValue * secQty);
    }`
);

content = content.replace(
`    // 3. Fallback to root user setting
    if (setting && setting.value !== undefined) {
        if (setting.type === 'FIXED') {
            return setting.value * secQty;
        } else {
            return (item.price * (setting.value / 100)) * secQty;
        }
    } 

    // 4. Fallback to JobType global baseCommission
    const base = jobType.baseCommission || 0;
    return base * secQty;`,
`    // 3. Fallback to root user setting
    if (setting && setting.value !== undefined) {
        if (setting.type === 'FIXED') {
            return finalCommission + (setting.value * secQty);
        } else {
            return finalCommission + ((item.price * (setting.value / 100)) * secQty);
        }
    } 

    // 4. Fallback to JobType global baseCommission
    const base = jobType.baseCommission || 0;
    return finalCommission + (base * secQty);`
);

fs.writeFileSync('utils/commissionUtils.ts', content);

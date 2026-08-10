const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(
`export const formatItemNameWithVariations = (item: JobItem, jobTypes: any[]) => {
    const jt = jobTypes.find(t => t.id === item.jobTypeId);
    if (!jt || !jt.variationGroups || jt.variationGroups.length === 0) return item.name;
    
    const parts: string[] = [];
    item.selectedVariationIds?.forEach(optId => {
        for (const group of jt.variationGroups!) {`,
`export const formatItemNameWithVariations = (item: JobItem, jobTypes: any[]) => {
    const jt = jobTypes.find(t => t.id === item.jobTypeId);
    if (!jt || ((!jt.variationGroups || jt.variationGroups.length === 0) && (!jt.variations || jt.variations.length === 0))) return item.name;
    const groups = (jt.variationGroups && jt.variationGroups.length > 0) ? jt.variationGroups : [{ id: 'default', name: 'Opções', options: jt.variations || [] }];
    
    const parts: string[] = [];
    item.selectedVariationIds?.forEach(optId => {
        for (const group of groups) {`
);

fs.writeFileSync('pages/JobDetails.tsx', content);

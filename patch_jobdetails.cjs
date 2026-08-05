const fs = require('fs');

let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// Line 2190
content = content.replace(
`if (!type || !type.variationGroups || type.variationGroups.length === 0) return null;
                                                  return (
                                                      <div className="grid grid-cols-1 gap-3 mt-2">
                                                          {type.variationGroups.map(group => (`,
`if (!type || ((!type.variationGroups || type.variationGroups.length === 0) && (!type.variations || type.variations.length === 0))) return null;
                                                  const groups = (type.variationGroups && type.variationGroups.length > 0) ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }];
                                                  return (
                                                      <div className="grid grid-cols-1 gap-3 mt-2">
                                                          {groups.map((group: any) => (`
);

// Line 2323
content = content.replace(
`if (!type || !type.variationGroups || type.variationGroups.length === 0) return null;
                                   return (
                                       <div className="grid grid-cols-1 gap-3 mt-2">
                                           {type.variationGroups.map(group => (`,
`if (!type || ((!type.variationGroups || type.variationGroups.length === 0) && (!type.variations || type.variations.length === 0))) return null;
                                   const groups = (type.variationGroups && type.variationGroups.length > 0) ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }];
                                   return (
                                       <div className="grid grid-cols-1 gap-3 mt-2">
                                           {groups.map((group: any) => (`
);

// Line 2877
content = content.replace(
`if (!itemJobType || !itemJobType.variationGroups || itemJobType.variationGroups.length === 0) return null;
                                                        
                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                                                                {itemJobType.variationGroups.map(group => (`,
`if (!itemJobType || ((!itemJobType.variationGroups || itemJobType.variationGroups.length === 0) && (!itemJobType.variations || itemJobType.variations.length === 0))) return null;
                                                        const groups = (itemJobType.variationGroups && itemJobType.variationGroups.length > 0) ? itemJobType.variationGroups : [{ id: 'default', name: 'Opções', options: itemJobType.variations || [] }];
                                                        
                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
                                                                {groups.map((group: any) => (`
);

fs.writeFileSync('pages/JobDetails.tsx', content);


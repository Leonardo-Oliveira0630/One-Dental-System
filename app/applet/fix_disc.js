const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const target1 = `                                        const isFixedDisc = isItemSurcharge
                                            ? (Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0)
                                            : (Boolean(item.appliedDiscountFixed) && Number(item.appliedDiscountFixed) > 0);`;

const replacement1 = `                                        const isFixedDisc = isItemSurcharge
                                            ? (item.surchargeType === 'FIXED' || (!item.surchargeType && Boolean(item.appliedSurchargeFixed) && Number(item.appliedSurchargeFixed) > 0))
                                            : (item.discountType === 'FIXED' || (!item.discountType && Boolean(item.appliedDiscountFixed) && Number(item.appliedDiscountFixed) > 0));`;

if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    console.log("Replaced isFixedDisc successfully");
} else {
    console.log("Target 1 not found");
}

const target2 = `                                                                    <select 
                                                                        value={isFixedDisc ? 'FIXED' : 'PERCENTAGE'}
                                                                        onChange={e => {
                                                                            const mode = e.target.value;
                                                                            if (isItemSurcharge) {
                                                                                if (mode === 'FIXED') {
                                                                                    handleUpdateEditItem(item.id, { appliedSurchargeFixed: Number(item.appliedSurcharge) || 0, appliedSurcharge: 0 });
                                                                                } else {
                                                                                    handleUpdateEditItem(item.id, { appliedSurcharge: Number(item.appliedSurchargeFixed) || 0, appliedSurchargeFixed: 0 });
                                                                                }
                                                                            } else {
                                                                                if (mode === 'FIXED') {
                                                                                    handleUpdateEditItem(item.id, { appliedDiscountFixed: Number(item.appliedDiscount) || 0, appliedDiscount: 0 });
                                                                                } else {
                                                                                    handleUpdateEditItem(item.id, { appliedDiscount: Number(item.appliedDiscountFixed) || 0, appliedDiscountFixed: 0 });
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-18 sm:w-20 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                                                                    >`;

const replacement2 = `                                                                    <select 
                                                                        value={isFixedDisc ? 'FIXED' : 'PERCENTAGE'}
                                                                        onChange={e => {
                                                                            const mode = e.target.value;
                                                                            if (isItemSurcharge) {
                                                                                if (mode === 'FIXED') {
                                                                                    handleUpdateEditItem(item.id, { surchargeType: 'FIXED', appliedSurchargeFixed: Number(item.appliedSurcharge) || Number(item.appliedSurchargeFixed) || 0, appliedSurcharge: 0 });
                                                                                } else {
                                                                                    handleUpdateEditItem(item.id, { surchargeType: 'PERCENTAGE', appliedSurcharge: Number(item.appliedSurchargeFixed) || Number(item.appliedSurcharge) || 0, appliedSurchargeFixed: 0 });
                                                                                }
                                                                            } else {
                                                                                if (mode === 'FIXED') {
                                                                                    handleUpdateEditItem(item.id, { discountType: 'FIXED', appliedDiscountFixed: Number(item.appliedDiscount) || Number(item.appliedDiscountFixed) || 0, appliedDiscount: 0 });
                                                                                } else {
                                                                                    handleUpdateEditItem(item.id, { discountType: 'PERCENTAGE', appliedDiscount: Number(item.appliedDiscountFixed) || Number(item.appliedDiscount) || 0, appliedDiscountFixed: 0 });
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-18 sm:w-20 px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-blue-500 outline-none"
                                                                    >`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log("Replaced select onChange successfully");
} else {
    console.log("Target 2 not found");
}

fs.writeFileSync('pages/JobDetails.tsx', content, 'utf8');
console.log("JobDetails.tsx updated successfully");

const fs = require('fs');
let content = fs.readFileSync('pages/lab/Finance.tsx', 'utf8');

content = content.replace(
`                                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg">
                                                                    {p.paymentMethod}
                                                                </span>`,
`                                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg">
                                                                    {translatePaymentMethod(p.paymentMethod)}
                                                                </span>`
);

content = content.replace(
`                                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded">
                                          {selectedPaymentForDetail.paymentMethod}
                                      </span>`,
`                                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded">
                                          {translatePaymentMethod(selectedPaymentForDetail.paymentMethod)}
                                      </span>`
);

fs.writeFileSync('pages/lab/Finance.tsx', content);

const fs = require('fs');
let code = fs.readFileSync('pages/Reports.tsx', 'utf-8');

const regex2 = /<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-slate-500 uppercase">Data Base<\/label>/;
const newSection2 = `{reportType !== 'CLIENTS' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Data Base</label>`;

if (regex2.test(code)) {
    code = code.replace(regex2, newSection2);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced dateType block start');
} else {
    console.log('Could not find dateType block start');
}

const regex3 = /<option value="DUE">Data de Entrega<\/option>\s*<\/select>\s*<\/div>/;
const newSection3 = `<option value="DUE">Data de Entrega</option>
            </select>
          </div>
          )}`;
if (regex3.test(code)) {
    code = code.replace(regex3, newSection3);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced dateType block end');
} else {
    console.log('Could not find dateType block end');
}

const regex4 = /<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por \(Prod\. Básica\)<\/label>/;
const newSection4 = `{reportType !== 'CLIENTS' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Agrupar Por (Prod. Básica)</label>`;
if (regex4.test(code)) {
    code = code.replace(regex4, newSection4);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced groupBy block start');
} else {
    console.log('Could not find groupBy block start');
}

const regex5 = /<option value="JOB_TYPE">Tipo de Trabalho<\/option>\s*<\/select>\s*<\/div>/;
const newSection5 = `<option value="JOB_TYPE">Tipo de Trabalho</option>
            </select>
          </div>
          )}`;
if (regex5.test(code)) {
    code = code.replace(regex5, newSection5);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced groupBy block end');
} else {
    console.log('Could not find groupBy block end');
}


const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

content = content.replace(/group\.options\.map\(option =>/g, "group.options.map((option: any) =>");
content = content.replace(/options\.find\(o =>/g, "options.find((o: any) =>");
content = content.replace(/options\.find\(\(o =>/g, "options.find((o: any) =>");

fs.writeFileSync('pages/JobDetails.tsx', content);

let content2 = fs.readFileSync('pages/lab/PriceTables.tsx', 'utf8');
content2 = content2.replace(/group\.options\.map\(opt =>/g, "group.options.map((opt: any) =>");
fs.writeFileSync('pages/lab/PriceTables.tsx', content2);

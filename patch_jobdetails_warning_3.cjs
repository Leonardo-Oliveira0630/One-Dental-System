const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

if (!code.includes("if (activeJobsWithSameBox.length > 0) {")) {
    code = code.replace(
        'const handleSaveChanges = async () => {',
        `const handleSaveChanges = async () => {
        if (activeJobsWithSameBox.length > 0) {
            alert('A caixa ' + editBoxNumber + ' já está em uso por outro caso em aberto. Finalize-o antes de usar esta caixa.');
            return;
        }`
    );
    fs.writeFileSync('pages/JobDetails.tsx', code);
    console.log("JobDetails handleSaveChanges patched");
} else {
    console.log("JobDetails handleSaveChanges already patched");
}

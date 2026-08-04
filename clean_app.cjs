const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove the purge block (lines 302-317)
code = code.replace(/\s*\/\/ Purga automática de claves EXP- antiguas[\s\S]*?\} catch \(e\) \{\}/, '');

// 2. Remove EXP- validation from line 435 (now line ~415 after purge)
code = code.replace(/\|\| currentKey\.startsWith\('EXP-'\)/g, '');

// 3. Simplify fetchConsolidatedTable logic
const startToken = '      // Filtrar identificaciones obsoletas tipo EXP-xxxx y el DNI del investigador';
const endToken = 'setInvitacionesList(finalRows)';
const regex = new RegExp(startToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + endToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const newLogic = `
      // Usar directamente los datos consolidados del backend (Firebase)
      let finalRows = rawList.filter(item => {
        const d = (item.dni || '').trim().toUpperCase()
        const c = (item.codigo || '').trim().toUpperCase()
        if (d === '09091855' || c === '09091855') return false
        return true
      })
      
      setInvitacionesList(finalRows)`;

code = code.replace(regex, newLogic);

// 4. Remove localInv EXP- logic
code = code.replace(/\|\| cleanCode\.startsWith\('EXP-'\)/g, '');

fs.writeFileSync('src/App.jsx', code);
console.log('App.jsx cleaned');

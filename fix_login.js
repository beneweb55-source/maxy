const fs = require('fs');
let code = fs.readFileSync('components/FormulaireConnexion.tsx', 'utf8');
code = code.replace(
  '<button type="submit" disabled={chargement || !identifiant.trim() || !motDePasse.trim()} className="btn btn-primaire w-full">',
  '<button type="submit" disabled={chargement || !username.trim() || !password.trim()} className="btn btn-primaire w-full">'
);
fs.writeFileSync('components/FormulaireConnexion.tsx', code);

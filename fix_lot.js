const fs = require('fs');
let code = fs.readFileSync('components/arrivages/FormulaireLot.tsx', 'utf8');
const oldBtn = `<button
            type="button"
            onClick={() => void creerLot()}
            disabled={envoi}
            className="btn btn-primaire w-full justify-center"
          >`;
const newBtn = `<button
            type="button"
            onClick={() => void creerLot()}
            disabled={envoi || !fournisseur.trim() || !quantiteAttendue.toString().trim()}
            className="btn btn-primaire w-full justify-center"
          >`;
code = code.replace(oldBtn, newBtn);
fs.writeFileSync('components/arrivages/FormulaireLot.tsx', code);

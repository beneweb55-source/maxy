const fs = require('fs');
let code = fs.readFileSync('components/admin/AdminClient.tsx', 'utf8');
const oldBtn = `<button
            type="button"
            disabled={envoi}
            onClick={() => void enregistrerParametres()}
            className="btn btn-primaire"
          >`;
const newBtn = `<button
            type="button"
            disabled={envoi || !margeMin.toString().trim() || !objectifReserve.toString().trim() || !pctReinvest.toString().trim() || !pctReserve.toString().trim() || !pctParts.toString().trim() || !pctFrais.toString().trim() || (Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) !== 100)}
            onClick={() => void enregistrerParametres()}
            className="btn btn-primaire"
          >`;
code = code.replace(oldBtn, newBtn);
fs.writeFileSync('components/admin/AdminClient.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('components/rapports/RapportDetail.tsx', 'utf8');

code = code.replace(
  'className="flex items-center gap-1.5 text-sm cursor-pointer border p-2 rounded hover:bg-brand-light-grey/20"',
  'className={`flex items-center gap-1.5 text-sm cursor-pointer border p-2 rounded transition ${decisions.get(p.id) === d ? "bg-brand-orange/10 border-brand-orange font-semibold" : "hover:bg-brand-light-grey/20"}`}'
);

fs.writeFileSync('components/rapports/RapportDetail.tsx', code);

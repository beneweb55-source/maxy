const fs = require('fs');
let code = fs.readFileSync('components/dashboard/widgets.tsx', 'utf8');

if (code.startsWith("import React from 'react';\\n\\"use client\\";")) {
  code = code.replace("import React from 'react';\\n\\"use client\\";", "\\"use client\\";\\nimport React from 'react';");
}
fs.writeFileSync('components/dashboard/widgets.tsx', code);

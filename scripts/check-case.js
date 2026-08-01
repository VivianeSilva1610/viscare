const fs = require('fs');
const path = require('path');

function check(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      check(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js')) {
      const c = fs.readFileSync(p, 'utf8');
      const m = c.match(/from\s+['"](\.[^'"]+)['"]/g);
      if (m) {
        for (const x of m) {
          const pth = x.match(/['"]([^'"]+)['"]/)[1];
          let p2 = path.resolve(dir, pth);
          
          const exts = ['', '.ts', '.tsx', '.js', '/index.ts', '/index.tsx'];
          let matchedExt = null;
          let foundPath = p2;
          
          // Basic check for case mismatch in filename
          const dirp2 = path.dirname(p2);
          if (fs.existsSync(dirp2)) {
            const b = path.basename(p2);
            const ls = fs.readdirSync(dirp2);
            // check if there is a file that matches case-insensitively but not case-sensitively
            const found = ls.find(e => {
                const eNoExt = e.replace(/\.(ts|tsx|js)$/, '');
                return eNoExt.toLowerCase() === b.toLowerCase() && eNoExt !== b;
            });
            if (found) {
              console.log('Mismatch in', p, 'importing', pth, 'should be', found);
            }
          }
        }
      }
    }
  }
}

check('./src');
check('./app');
console.log('done');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/inventario.db');

// Detect timezone offset
const offsetHours = new Date().getTimezoneOffset() / 60; // positive = behind UTC
const offsetStr = offsetHours > 0 ? `-${offsetHours} hours` : `+${Math.abs(offsetHours)} hours`;
console.log(`Timezone offset: ${offsetStr}`);

db.all('SELECT id, fecha FROM ventas', (err, rows) => {
  if (err) { console.error(err); return; }
  console.log('Ventas BEFORE fix:');
  rows.forEach(v => console.log(`  id: ${v.id}, fecha: ${v.fecha}`));
  
  db.run(`UPDATE ventas SET fecha = datetime(fecha, '${offsetStr}')`, function(err2) {
    if (err2) { console.error('Error:', err2); return; }
    console.log(`Updated ${this.changes} ventas to local time`);
    
    db.all('SELECT id, fecha FROM ventas', (err3, rows2) => {
      console.log('Ventas AFTER fix:');
      rows2.forEach(v => console.log(`  id: ${v.id}, fecha: ${v.fecha}`));
      db.close();
    });
  });
});

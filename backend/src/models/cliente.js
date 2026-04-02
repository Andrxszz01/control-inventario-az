// backend/src/models/cliente.js
const db = require('../database/connection');

const Cliente = {
  create: ({ nombre, telefono, direccion, email }) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO clientes (nombre, telefono, direccion, email) VALUES (?, ?, ?, ?)',
        [nombre, telefono, direccion, email],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, nombre, telefono, direccion, email });
        }
      );
    });
  },

  findAll: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM clientes', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  update: (id, { nombre, telefono, direccion, email }) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, email = ? WHERE id = ?',
        [nombre, telefono, direccion, email, id],
        function (err) {
          if (err) return reject(err);
          resolve({ id, nombre, telefono, direccion, email });
        }
      );
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM clientes WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  },
};

module.exports = Cliente;

const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE nombre = $1 AND contraseña = $2',
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'Login exitoso' });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

// REGISTER
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT * FROM usuarios WHERE nombre = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'El nombre de usuario ya existe' });
    }

    const id = `user_${Date.now()}`;
    await pool.query(
      'INSERT INTO usuarios (id, nombre, contraseña) VALUES ($1, $2, $3)',
      [id, username, password]
    );

    res.status(201).json({ success: true, message: 'Registro exitoso' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

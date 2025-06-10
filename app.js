const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Aumentar el límite del tamaño del cuerpo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors());

// LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE nombre = $1 AND contrasena = $2',
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

    await pool.query(
      'INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2)',
      [username, password]
    );

    res.status(201).json({ success: true, message: 'Registro exitoso' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.post('/hacerDenuncia', upload.single('imagen'), async (req, res) => {
  const { tipoDenuncia, descripcion, latitud, longitud, username } = req.body;
  const imagen = req.file;

  // Validar campos obligatorios
  if (!imagen || !tipoDenuncia || !latitud || !longitud || !username) {
    return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
  }

  try {
    // Obtener el usuarios_id basado en el username
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE nombre = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const usuarios_id = userResult.rows[0].id;

    // Insertar la denuncia en la base de datos
    await pool.query(
      `INSERT INTO denuncia (tipoDenuncia, imagen, descripcion, usuarios_id, latitud, longitud) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tipoDenuncia, imagen.buffer, descripcion || null, usuarios_id, latitud, longitud]
    );

    res.status(201).json({ success: true, message: 'Denuncia registrada exitosamente' });
  } catch (error) {
    console.error('Error al registrar la denuncia:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.get('/denuncia/imagen/', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM denuncia',
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
    }

    const imagen = result.rows[0].imagen;

    res.set('Content-Type', 'image/png'); // Cambia a image/jpeg si tus imágenes son jpg
    res.send(imagen);
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.get('/denuncia/imagen/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT imagen FROM denuncia WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
    }

    const imagen = result.rows[0].imagen;

    res.set('Content-Type', 'image/png'); // Cambia a image/jpeg si tus imágenes son jpg
    res.send(imagen);
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
});

app.post('/run-sql', async (req, res) => {
  const { sql } = req.body;

  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'Falta o formato inválido en "sql"' });
  }

  try {
    const [result] = await pool.query(
      sql
    );
    
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

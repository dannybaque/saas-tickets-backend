const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const register = async (req, res) => {
  const { company_name, slug, admin_email, password } = req.body

  try {
    // Verificar que el slug no exista
    const existing = await pool.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [slug]
    )
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ese slug ya está en uso' })
    }

    // Crear el tenant (empresa)
    const tenant = await pool.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
      [company_name, slug]
    )
    const tenant_id = tenant.rows[0].id

    // Crear rol admin por defecto
    const role = await pool.query(
      'INSERT INTO roles (tenant_id, name, level) VALUES ($1, $2, $3) RETURNING id',
      [tenant_id, 'admin', 99]
    )
    const role_id = role.rows[0].id

    // Encriptar contraseña
    const hashed = await bcrypt.hash(password, 10)

    // Crear usuario admin
    const user = await pool.query(
      'INSERT INTO users (tenant_id, role_id, email, name, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [tenant_id, role_id, admin_email, company_name, hashed]
    )
    const user_id = user.rows[0].id

    // Generar token
    const token = jwt.sign(
      { user_id, tenant_id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ tenant_id, user_id, token, plan: 'starter' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body

  try {
    // Buscar usuario
    const result = await pool.query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const user = result.rows[0]

    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    // Generar token
    const token = jwt.sign(
      { user_id: user.id, tenant_id: user.tenant_id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user_id: user.id, tenant_id: user.tenant_id, role: user.role_name })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


module.exports = { register, login }


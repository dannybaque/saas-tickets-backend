const pool = require('../db/pool')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const createUser = async (req, res) => {
    console.log('Body recibido:', req.body)
    const {role_id, email, name, password, is_active} = req.body
    const {tenant_id } = req.user
    try {
        // Verificar que el correo no exista
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
            [email, tenant_id]
        )

        if (existing.rows.length >0) {
            return res.status(400).json({error: 'Este correo ya esta en uso'})
        }
        // Encriptar contraseña
            const hashed = await bcrypt.hash(password, 10)
        // Crear el usuario en el tenant
        const users = await pool.query(
            'INSERT INTO users (tenant_id,role_id,email,name,password,is_active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [tenant_id,role_id,email,name,hashed,is_active]
        )
        res.status(201).json(users.rows[0])


    } catch (error) {
        console.error('Error createUser:', error.message)
        res.status(500).json({ error: 'Error interno del servidor' })
    }

}

    const getUsers = async (req, res) => {
        const {tenant_id} = req.user
        const { search } = req.query

        try {
            let query = `SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at, u.inactive_at,
                                r.name as role_name, r.level as role_level
                        FROM users u
                        LEFT JOIN roles r ON u.role_id = r.id
                        WHERE u.tenant_id = $1`
            const params = [tenant_id]

            if (search) {
                params.push(`%${search}%`)
                query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`
            }

            query += ' ORDER BY u.created_at ASC'

            const users = await pool.query(query, params)
            res.json(users.rows)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Error interno del servidor' })
        }
    }


const updateStatus = async (req, res) => {
    const { tenant_id } = req.user
    const { id } = req.params
    const { is_active } = req.body

    try {
        const result = await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, name, is_active',
            [is_active, id, tenant_id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' })
        }

        res.json(result.rows[0])

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const updateRole = async (req, res) => {
    const { tenant_id } = req.user
    const { id } = req.params
    const { role_id } = req.body

    try {
        const result = await pool.query(
            'UPDATE users SET role_id = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, name, role_id',
            [role_id, id, tenant_id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' })
        }

        res.json(result.rows[0])

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const getUserById = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params

  try {
    const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at, u.inactive_at,
                r.id as role_id, r.name as role_name, r.level as role_level
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.tenant_id = $2`,
      [id, tenant_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const updateUser = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params
  const { name, role_id, is_active } = req.body

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, role_id = $2, is_active = $3,
           updated_at = NOW(),
           inactive_at = CASE WHEN $3 = false THEN NOW() ELSE null END
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, name, role_id, is_active, updated_at, inactive_at`,
      [name, role_id, is_active, id, tenant_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}




module.exports = { createUser, getUsers, updateRole, updateStatus, getUserById, updateUser}
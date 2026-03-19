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
        console.error(error)
        res.status(500).json({ error: 'Error interno del servidor' })
    }
}

const getUsers = async (req,res) =>{
    const {tenant_id} = req.user
    try {
        const users = await pool.query(
            'SELECT id, tenant_id, role_id, email, name, is_active, created_at FROM users WHERE tenant_id = $1',
            [tenant_id]
        )
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


module.exports = { createUser, getUsers,updateRole,updateStatus }
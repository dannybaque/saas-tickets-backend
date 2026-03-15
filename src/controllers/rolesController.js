const pool = require('../db/pool')

const getRoles = async (req, res) => {
  const { tenant_id } = req.user
  try {
    const result = await pool.query(
      'SELECT id, name, level FROM roles WHERE tenant_id = $1 ORDER BY level ASC',
      [tenant_id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const createRole = async (req, res) => {
  const { tenant_id } = req.user
  const { name, level } = req.body

  try {
    const result = await pool.query(
      'INSERT INTO roles (tenant_id, name, level) VALUES ($1, $2, $3) RETURNING *',
      [tenant_id, name, level]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const deleteRole = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params

  try {
    const result = await pool.query(
      'DELETE FROM roles WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


module.exports = { getRoles,createRole,deleteRole }

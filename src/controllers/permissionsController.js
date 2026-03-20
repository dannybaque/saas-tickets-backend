const pool = require('../db/pool')

const getPermissions = async (req, res) => {
  const { tenant_id } = req.user

  try {
    const result = await pool.query(
      'SELECT * FROM permissions WHERE tenant_id = $1 ORDER BY level ASC, action ASC',
      [tenant_id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const upsertPermission = async (req, res) => {
  const { tenant_id } = req.user
  const { level, action, allowed } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO permissions (tenant_id, level, action, allowed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, level, action)
       DO UPDATE SET allowed = $4
       RETURNING *`,
      [tenant_id, level, action, allowed]
    )
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getPermissions, upsertPermission }

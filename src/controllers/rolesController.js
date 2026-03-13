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

module.exports = { getRoles }

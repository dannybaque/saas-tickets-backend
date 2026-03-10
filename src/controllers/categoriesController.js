const pool = require('../db/pool')

const getCategories = async (req, res) => {
  const { tenant_id } = req.user

  try {
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE tenant_id = $1',
      [tenant_id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getCategories }

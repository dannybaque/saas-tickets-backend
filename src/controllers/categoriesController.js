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

const createCategory = async (req, res) => {
  const { tenant_id } = req.user
  const { name, target_role_id } = req.body

  try {
    const result = await pool.query(
      'INSERT INTO categories (tenant_id, name, target_role_id) VALUES ($1, $2, $3) RETURNING *',
      [tenant_id, name, target_role_id]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const deleteCategory = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params

  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getCategories, createCategory, deleteCategory }

const pool = require('../db/pool')

const getDashboard = async (req, res) => {
  const { tenant_id, user_id } = req.user

  try {
    const [open, assigned, resolved, recent] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM tickets WHERE tenant_id = $1 AND status = 'open'`,
        [tenant_id]
      ),
      pool.query(
        `SELECT COUNT(*) FROM tickets WHERE tenant_id = $1 AND assigned_to = $2 AND status != 'closed'`,
        [tenant_id, user_id]
      ),
      pool.query(
        `SELECT COUNT(*) FROM tickets WHERE tenant_id = $1 AND status = 'resolved' AND created_at >= NOW() - INTERVAL '7 days'`,
        [tenant_id]
      ),
      pool.query(
        `SELECT t.id, t.title, t.status, t.priority, t.created_at, u.name as created_by_name
         FROM tickets t
         JOIN users u ON t.created_by = u.id
         WHERE t.tenant_id = $1
         ORDER BY t.created_at DESC LIMIT 5`,
        [tenant_id]
      )
    ])

    res.json({
      open:     parseInt(open.rows[0].count),
      assigned: parseInt(assigned.rows[0].count),
      resolved: parseInt(resolved.rows[0].count),
      recent:   recent.rows
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getDashboard }

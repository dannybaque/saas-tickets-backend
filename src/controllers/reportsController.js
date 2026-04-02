const pool = require('../db/pool')

const getReports = async (req, res) => {
  const { tenant_id } = req.user
  const { period = '30' } = req.query // días

  try {
    const [volume, backlog, mttr, slaCompliance] = await Promise.all([

      // Volumen de tickets por día
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM tickets
        WHERE tenant_id = $1
          AND created_at >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [tenant_id]),

      // Backlog - tickets abiertos sin resolver
      pool.query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN priority = 'high'   THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN priority = 'low'    THEN 1 ELSE 0 END) as low
        FROM tickets
        WHERE tenant_id = $1
          AND status IN ('open', 'in_progress')
      `, [tenant_id]),

      // MTTR - tiempo promedio de resolución en horas
      pool.query(`
        SELECT ROUND(
          AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::numeric, 1
        ) as avg_hours
        FROM tickets
        WHERE tenant_id = $1
          AND status = 'closed'
          AND closed_at IS NOT NULL
          AND created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      `, [tenant_id]),

      // SLA Compliance
      pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE 
            WHEN s.hours IS NOT NULL AND 
                 EXTRACT(EPOCH FROM (COALESCE(closed_at, NOW()) - created_at)) / 3600 <= s.hours 
            THEN 1 ELSE 0 
          END) as within_sla
        FROM tickets t
        LEFT JOIN sla_policies s ON s.tenant_id = t.tenant_id AND s.priority = t.priority
        WHERE t.tenant_id = $1
          AND t.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
      `, [tenant_id])
    ])

    const slaTotal = parseInt(slaCompliance.rows[0].total)
    const slaWithin = parseInt(slaCompliance.rows[0].within_sla)
    const slaPercent = slaTotal > 0 ? Math.round((slaWithin / slaTotal) * 100) : 100

    res.json({
      period: parseInt(period),
      volume: volume.rows,
      backlog: {
        total:  parseInt(backlog.rows[0].total),
        high:   parseInt(backlog.rows[0].high),
        medium: parseInt(backlog.rows[0].medium),
        low:    parseInt(backlog.rows[0].low)
      },
      mttr: parseFloat(mttr.rows[0].avg_hours) || 0,
      sla: {
        percent: slaPercent,
        total:   slaTotal,
        within:  slaWithin
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getReports }

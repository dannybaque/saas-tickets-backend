const pool = require('../db/pool')

const createTicket = async (req, res) => {
  const { title, description, category_id, priority } = req.body
  const { user_id, tenant_id } = req.user

  try {
    const ticket = await pool.query(
      `INSERT INTO tickets (tenant_id, created_by, category_id, title, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [tenant_id, user_id, category_id, title, description, priority || 'medium']
    )

    await pool.query(
      `INSERT INTO ticket_events (ticket_id, user_id, event_type, new_value)
       VALUES ($1, $2, $3, $4)`,
      [ticket.rows[0].id, user_id, 'created', { status: 'open' }]
    )

    res.status(201).json(ticket.rows[0])

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getTickets = async (req, res) => {
  const { tenant_id } = req.user
  const { status, priority, search } = req.query

  try {
    let query = `SELECT t.*, u.name as created_by_name 
                 FROM tickets t 
                 JOIN users u ON t.created_by = u.id
                 WHERE t.tenant_id = $1`
    const params = [tenant_id]

    if (status) {
      params.push(status)
      query += ` AND t.status = $${params.length}`
    }

    if (priority) {
      params.push(priority)
      query += ` AND t.priority = $${params.length}`
    }

    if (search) {
      params.push(`%${search}%`)
      query += ` AND t.title ILIKE $${params.length}`
    }

    query += ' ORDER BY t.created_at DESC'

    const result = await pool.query(query, params)
    res.json({ data: result.rows, total: result.rows.length })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


const getTicketById = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params

  try {
    const ticket = await pool.query(
      `SELECT t.*, u.name as created_by_name 
       FROM tickets t 
       JOIN users u ON t.created_by = u.id
       WHERE t.id = $1 AND t.tenant_id = $2`,
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    const comments = await pool.query(
      `SELECT c.*, u.name as author 
       FROM comments c 
       JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1 AND c.is_internal = false
       ORDER BY c.created_at ASC`,
      [id]
    )

    const events = await pool.query(
      `SELECT e.*, u.name as by 
       FROM ticket_events e 
       JOIN users u ON e.user_id = u.id
       WHERE e.ticket_id = $1 
       ORDER BY e.created_at ASC`,
      [id]
    )

    res.json({
      ...ticket.rows[0],
      comments: comments.rows,
      events: events.rows
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const assignTicket = async (req, res) => {
  const { user_id, tenant_id } = req.user
  const { id } = req.params

  try {
    // Verificar que el ticket existe y pertenece al tenant
    const ticket = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    if (ticket.rows[0].assigned_to) {
      return res.status(400).json({ error: 'El ticket ya está asignado' })
    }

    // Verificar que el rol del usuario puede atender esta categoría
    const category = await pool.query(
      `SELECT c.target_role_id, u.role_id 
       FROM categories c, users u 
       WHERE c.id = $1 AND u.id = $2`,
      [ticket.rows[0].category_id, user_id]
    )

    if (category.rows[0].target_role_id !== category.rows[0].role_id) {
      return res.status(403).json({ error: 'Tu rol no puede atender este tipo de ticket' })
    }

    // Asignar ticket
    const updated = await pool.query(
      `UPDATE tickets SET assigned_to = $1, status = 'in_progress'
       WHERE id = $2 RETURNING *`,
      [user_id, id]
    )

    // Registrar evento
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, user_id, event_type, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, user_id, 'assigned',
        { assigned_to: null, status: 'open' },
        { assigned_to: user_id, status: 'in_progress' }
      ]
    )

    res.json({
      success: true,
      assigned_to: user_id,
      status: updated.rows[0].status
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const addComment = async (req, res) => {
  const { user_id, tenant_id } = req.user
  const { id } = req.params
  const { body, is_internal } = req.body

  try {
    // Verificar que el ticket pertenece al tenant
    const ticket = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    const comment = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, body, is_internal)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, user_id, body, is_internal || false]
    )

    // Registrar evento
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, user_id, event_type, new_value)
       VALUES ($1, $2, $3, $4)`,
      [id, user_id, 'comment_added', { is_internal: is_internal || false }]
    )

    res.status(201).json(comment.rows[0])

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const changeStatus = async (req, res) => {
  const { user_id, tenant_id } = req.user
  const { id } = req.params
  const { status } = req.body

  const validStatuses = ['open', 'in_progress', 'resolved', 'closed']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${validStatuses.join(', ')}` })
  }

  try {
    const ticket = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    const old_status = ticket.rows[0].status

    const updated = await pool.query(
      `UPDATE tickets 
       SET status = $1, closed_at = $2
       WHERE id = $3 RETURNING *`,
      [status, status === 'closed' ? new Date() : null, id]
    )

    // Registrar evento
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, user_id, event_type, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, user_id, 'status_changed',
        { status: old_status },
        { status }
      ]
    )

    res.json({
      success: true,
      old_status,
      new_status: status,
      closed_at: updated.rows[0].closed_at
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


module.exports = { createTicket, getTickets, getTicketById, assignTicket, addComment, changeStatus }

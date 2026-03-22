const pool = require('../db/pool')
const { sendTicketCreated, sendTicketAssigned, sendStatusChanged, sendCommentAdded } = require('../utils/email')


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

        // Notificar por email
    try {
      const adminResult = await pool.query(
        `SELECT u.email, t.name as tenant_name 
         FROM users u 
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.tenant_id = $1 AND u.role_id IN (
           SELECT id FROM roles WHERE tenant_id = $1 AND level = 99
         ) LIMIT 1`,
        [tenant_id]
      )
      if (adminResult.rows.length > 0) {
        await sendTicketCreated({
          to: adminResult.rows[0].email,
          ticketTitle: title,
          tenantName: adminResult.rows[0].tenant_name
        })
      }
    } catch (emailError) {
      console.error('Error enviando email:', emailError)
    }

    res.status(201).json(ticket.rows[0])

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getTickets = async (req, res) => {
  const { tenant_id } = req.user
  const { status, priority, search, page = 1, limit = 10 } = req.query

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

    // Contar total
    const countResult = await pool.query(
      query.replace(`SELECT t.*, u.name as created_by_name`, 'SELECT COUNT(*)'),
      params
    )
    const total = parseInt(countResult.rows[0].count)

    // Paginación
    const offset = (page - 1) * limit
    params.push(limit)
    query += ` ORDER BY t.created_at DESC LIMIT $${params.length}`
    params.push(offset)
    query += ` OFFSET $${params.length}`

    const result = await pool.query(query, params)

    res.json({
      data:       result.rows,
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit)
    })

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

    // Admin puede asignarse cualquier ticket
    const userLevel = await pool.query(
      'SELECT r.level FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [user_id]
    )

    if (userLevel.rows[0].level !== 99) {
      if (category.rows[0].target_role_id !== category.rows[0].role_id) {
        return res.status(403).json({ error: 'Tu rol no puede atender este tipo de ticket' })
      }
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

        // Notificar por email al creador del ticket
    try {
      const creatorResult = await pool.query(
        `SELECT u.email, u.name, t2.title
         FROM users u
         JOIN tickets t2 ON t2.created_by = u.id
         WHERE t2.id = $1`,
        [id]
      )
      const agentResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [user_id]
      )
      if (creatorResult.rows.length > 0) {
        await sendTicketAssigned({
          to: creatorResult.rows[0].email,
          ticketTitle: creatorResult.rows[0].title,
          assignedTo: agentResult.rows[0].name
        })
      }
      // Notificar al agente
      if (agentResult.rows.length > 0) {
        await sendTicketAssigned({
          to: agentResult.rows[0].email,
          ticketTitle: creatorResult.rows[0].title,
          assignedTo: agentResult.rows[0].name
        })
      }
    } catch (emailError) {
      console.error('Error enviando email:', emailError)
    }



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

          // Notificar al creador del ticket
      try {
        const creatorResult = await pool.query(
          `SELECT u.email, u.name as commenter_name, t2.title
          FROM users u
          JOIN tickets t2 ON t2.created_by = u.id
          WHERE t2.id = $1`,
          [id]
        )
        const commenterResult = await pool.query(
          'SELECT name FROM users WHERE id = $1',
          [user_id]
        )
        if (creatorResult.rows.length > 0) {
          await sendCommentAdded({
            to: creatorResult.rows[0].email,
            ticketTitle: creatorResult.rows[0].title,
            commentBy: commenterResult.rows[0].name
          })
        }
      } catch (emailError) {
        console.error('Error enviando email:', emailError)
      }


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

        // Notificar por email al creador del ticket
    try {
      const creatorResult = await pool.query(
        `SELECT u.email, t2.title
         FROM users u
         JOIN tickets t2 ON t2.created_by = u.id
         WHERE t2.id = $1`,
        [id]
      )
      if (creatorResult.rows.length > 0) {
        await sendStatusChanged({
          to: creatorResult.rows[0].email,
          ticketTitle: creatorResult.rows[0].title,
          newStatus: status
        })
      }
    } catch (emailError) {
      console.error('Error enviando email:', emailError)
    }


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

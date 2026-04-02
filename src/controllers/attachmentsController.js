const pool = require('../db/pool')
const { uploadFile, deleteFile, getSignedUrl } = require('../utils/storage')

const uploadAttachment = async (req, res) => {
  const { user_id, tenant_id } = req.user
  const { id } = req.params

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' })
    }

    // Verificar que el ticket pertenece al tenant
    const ticket = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    // Subir archivo a Supabase
    const fileData = await uploadFile(req.file, id, tenant_id)

    // Guardar en base de datos
    const attachment = await pool.query(
    `INSERT INTO attachments (ticket_id, user_id, filename, path, url, size, mimetype)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, user_id, fileData.filename, fileData.path, '', fileData.size, fileData.mimetype]
    )

    res.status(201).json(attachment.rows[0])

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al subir archivo' })
  }
}

const getAttachments = async (req, res) => {
  const { tenant_id } = req.user
  const { id } = req.params

  try {
    const ticket = await pool.query(
      'SELECT id FROM tickets WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    )

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' })
    }

    const attachments = await pool.query(
      'SELECT * FROM attachments WHERE ticket_id = $1 ORDER BY created_at ASC',
      [id]
    )

    // Generar URLs firmadas para cada adjunto
    const attachmentsWithUrls = await Promise.all(
      attachments.rows.map(async (att) => {
        const signedUrl = await getSignedUrl(att.path)
        return { ...att, url: signedUrl }
      })
    )

    res.json(attachmentsWithUrls)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


const deleteAttachment = async (req, res) => {
  const { tenant_id } = req.user
  const { id, attachmentId } = req.params

  try {
    const attachment = await pool.query(
      `SELECT a.* FROM attachments a
       JOIN tickets t ON a.ticket_id = t.id
       WHERE a.id = $1 AND t.tenant_id = $2`,
      [attachmentId, tenant_id]
    )

    if (attachment.rows.length === 0) {
      return res.status(404).json({ error: 'Adjunto no encontrado' })
    }

    await deleteFile(attachment.rows[0].path)

    await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId])

    res.json({ success: true })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al eliminar archivo' })
  }
}

module.exports = { uploadAttachment, getAttachments, deleteAttachment }

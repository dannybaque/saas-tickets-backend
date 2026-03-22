const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const sendTicketCreated = async ({ to, ticketTitle, tenantName }) => {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `Nuevo ticket: ${ticketTitle}`,
    html: `
      <h2>Nuevo ticket creado</h2>
      <p>Se ha creado un nuevo ticket en <strong>${tenantName}</strong>.</p>
      <p><strong>Título:</strong> ${ticketTitle}</p>
      <p>Ingresa al sistema para ver los detalles.</p>
    `
  })
}

const sendTicketAssigned = async ({ to, ticketTitle, assignedTo }) => {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `Ticket asignado: ${ticketTitle}`,
    html: `
      <h2>Ticket asignado</h2>
      <p>El ticket <strong>${ticketTitle}</strong> ha sido asignado a <strong>${assignedTo}</strong>.</p>
      <p>Ingresa al sistema para ver los detalles.</p>
    `
  })
}

const sendStatusChanged = async ({ to, ticketTitle, newStatus }) => {
  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: `Ticket actualizado: ${ticketTitle}`,
    html: `
      <h2>Estado del ticket actualizado</h2>
      <p>El ticket <strong>${ticketTitle}</strong> cambió su estado a <strong>${newStatus}</strong>.</p>
      <p>Ingresa al sistema para ver los detalles.</p>
    `
  })
}

module.exports = { sendTicketCreated, sendTicketAssigned, sendStatusChanged }

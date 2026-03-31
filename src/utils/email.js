const { Resend } = require('resend')

const getResend = () => new Resend(process.env.RESEND_API_KEY)

    const sendTicketCreated = async ({ to, ticketTitle, tenantName }) => {
    await getResend().emails.send({
        from: 'notificaciones@dysior.com',
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
    await getResend().emails.send({
        from: 'notificaciones@dysior.com',
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
    await getResend().emails.send({
        from: 'notificaciones@dysior.com',
        to,
        subject: `Ticket actualizado: ${ticketTitle}`,
        html: `
        <h2>Estado del ticket actualizado</h2>
        <p>El ticket <strong>${ticketTitle}</strong> cambió su estado a <strong>${newStatus}</strong>.</p>
        <p>Ingresa al sistema para ver los detalles.</p>
        `
    })
    }

    const sendCommentAdded = async ({ to, ticketTitle, commentBy }) => {
    await getResend().emails.send({
        from: 'notificaciones@dysior.com',
        to,
        subject: `Nuevo comentario en: ${ticketTitle}`,
        html: `
        <h2>Nuevo comentario</h2>
        <p><strong>${commentBy}</strong> comentó en el ticket <strong>${ticketTitle}</strong>.</p>
        <p>Ingresa al sistema para ver el comentario.</p>
        `
    })
    }


module.exports = { sendTicketCreated, sendTicketAssigned, sendStatusChanged, sendCommentAdded }

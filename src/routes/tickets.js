const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { createTicket, getTickets, getTicketById } = require('../controllers/ticketsController')

router.use(authMiddleware)

router.get('/',     getTickets)
router.post('/',    createTicket)
router.get('/:id',  getTicketById)

module.exports = router

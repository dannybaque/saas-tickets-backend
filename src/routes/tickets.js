const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { createTicket, getTickets, getTicketById, assignTicket, addComment, changeStatus } = require('../controllers/ticketsController')

router.use(authMiddleware)

router.get('/',                getTickets)
router.post('/',               createTicket)
router.get('/:id',             getTicketById)
router.put('/:id/assign',      assignTicket)
router.post('/:id/comments',   addComment)
router.put('/:id/status',      changeStatus)

module.exports = router

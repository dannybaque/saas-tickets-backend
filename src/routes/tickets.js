const express = require('express')
const router = express.Router()
const { authMiddleware, requireLevel } = require('../middleware/auth')
const { createTicket, getTickets, getTicketById, assignTicket, addComment, changeStatus } = require('../controllers/ticketsController')

router.use(authMiddleware)

router.get('/',                          getTickets)
router.post('/',                         createTicket)
router.get('/:id',                       getTicketById)
router.put('/:id/assign',   requireLevel(2), assignTicket)
router.post('/:id/comments',             addComment)
router.put('/:id/status',   requireLevel(2), changeStatus)


module.exports = router

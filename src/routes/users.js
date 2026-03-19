const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { createUser, getUsers, updateStatus, updateRole } = require('../controllers/usersController')

router.use(authMiddleware)

router.get('/',              getUsers)
router.post('/',             createUser)
router.put('/:id/status',    updateStatus)
router.put('/:id/role',      updateRole)

module.exports = router

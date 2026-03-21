const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { createUser, getUsers, updateStatus, updateRole, getUserById, updateUser } = require('../controllers/usersController')

router.use(authMiddleware)

router.get('/',           getUsers)
router.post('/',          createUser)
router.get('/:id',        getUserById)
router.put('/:id',        updateUser)
router.put('/:id/status', updateStatus)
router.put('/:id/role',   updateRole)


module.exports = router

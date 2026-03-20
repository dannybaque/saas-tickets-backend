const express = require('express')
const router = express.Router()
const { authMiddleware, requireLevel } = require('../middleware/auth')
const { getPermissions, upsertPermission } = require('../controllers/permissionsController')

router.use(authMiddleware)

router.get('/',  requireLevel(99), getPermissions)
router.post('/', requireLevel(99), upsertPermission)

module.exports = router

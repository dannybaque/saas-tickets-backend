const express = require('express')
const router = express.Router()
const { authMiddleware, requireLevel,checkTenantAccess } = require('../middleware/auth')
const { getPermissions, upsertPermission } = require('../controllers/permissionsController')

router.use(authMiddleware)
router.use(checkTenantAccess)

router.get('/', getPermissions)
router.post('/', requireLevel(99), upsertPermission)

module.exports = router


const express = require('express')
const router = express.Router()
const { authMiddleware,checkTenantAccess } = require('../middleware/auth')
const { getRoles, createRole, deleteRole } = require('../controllers/rolesController')

router.use(authMiddleware)
router.use(checkTenantAccess)

router.get('/',       getRoles)
router.post('/',      createRole)
router.delete('/:id', deleteRole)

module.exports = router
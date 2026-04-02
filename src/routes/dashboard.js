const express = require('express')
const router = express.Router()
const { authMiddleware,checkTenantAccess } = require('../middleware/auth')
const { getDashboard } = require('../controllers/dashboardController')

router.use(authMiddleware)
router.use(checkTenantAccess)
router.get('/', getDashboard)

module.exports = router

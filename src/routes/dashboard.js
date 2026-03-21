const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const { getDashboard } = require('../controllers/dashboardController')

router.use(authMiddleware)
router.get('/', getDashboard)

module.exports = router

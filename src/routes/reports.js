const express = require('express')
const router = express.Router()
const { authMiddleware, requireLevel } = require('../middleware/auth')
const { getReports } = require('../controllers/reportsController')

router.use(authMiddleware)
router.get('/', requireLevel(99), getReports)

module.exports = router

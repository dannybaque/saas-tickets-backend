const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { getRoles } = require('../controllers/rolesController')

router.use(authMiddleware)
router.get('/', getRoles)

module.exports = router

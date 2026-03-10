const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { getCategories } = require('../controllers/categoriesController')

router.use(authMiddleware)

router.get('/', getCategories)

module.exports = router

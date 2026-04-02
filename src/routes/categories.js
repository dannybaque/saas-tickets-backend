const express = require('express')
const router = express.Router()
const { authMiddleware,checkTenantAccess } = require('../middleware/auth')
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoriesController')

router.use(authMiddleware)
router.use(checkTenantAccess)

router.get('/',       getCategories)
router.post('/',      createCategory)
router.delete('/:id', deleteCategory)

module.exports = router

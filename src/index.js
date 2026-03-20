const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

const authRoutes       = require('./routes/auth')
const ticketRoutes     = require('./routes/tickets')
const categoriesRoutes = require('./routes/categories')
const rolesRoutes      = require('./routes/roles')
const usersRoutes      = require('./routes/users')
const permissionsRoutes = require('./routes/permissions')


app.use('/api/auth',       authRoutes)
app.use('/api/tickets',    ticketRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/roles',      rolesRoutes)
app.use('/api/users',      usersRoutes)
app.use('/api/permissions', permissionsRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'SaaS Tickets API corriendo' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

module.exports = app
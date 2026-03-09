const express = require('express')
const app = express()
require('dotenv').config()

app.use(express.json())

const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

const ticketRoutes = require('./routes/tickets')
app.use('/api/tickets', ticketRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'SaaS Tickets API corriendo' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

module.exports = app

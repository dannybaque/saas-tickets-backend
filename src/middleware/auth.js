const pool = require('../db/pool')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

const checkTenantAccess = async (req, res, next) => {
  const { tenant_id } = req.user

  try {
    const result = await pool.query(
      'SELECT is_paid, trial_ends_at FROM tenants WHERE id = $1',
      [tenant_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    const tenant = result.rows[0]
    const now = new Date()
    const trialEnd = new Date(tenant.trial_ends_at)

    if (!tenant.is_paid && now > trialEnd) {
      return res.status(402).json({ 
        error: 'Trial expirado',
        message: 'Tu período de prueba ha terminado. Contáctanos para activar tu plan.',
        contact: 'hola@dysior.com'
      })
    }

    next()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}


const requireLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (req.user.level < minLevel) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' })
    }
    next()
  }
}


module.exports = {authMiddleware,requireLevel,checkTenantAccess}

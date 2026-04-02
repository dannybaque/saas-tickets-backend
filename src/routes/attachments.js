const express = require('express')
const router = express.Router({ mergeParams: true })
const multer = require('multer')
const { authMiddleware } = require('../middleware/auth')
const { uploadAttachment, getAttachments, deleteAttachment } = require('../controllers/attachmentsController')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido'))
    }
  }
})

router.use(authMiddleware)

router.get('/',                        getAttachments)
router.post('/', upload.single('file'), uploadAttachment)
router.delete('/:attachmentId',        deleteAttachment)

module.exports = router

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

    const uploadFile = async (file, ticketId, tenantId) => {
    const ext = file.originalname.split('.').pop()
    const filename = `${tenantId}/${ticketId}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(filename, file.buffer, {
        contentType: file.mimetype
        })

    if (error) throw error

    return {
        filename: file.originalname,
        path: filename,
        size: file.size,
        mimetype: file.mimetype
    }
    }


    const deleteFile = async (path) => {
    const { error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .remove([path])

    if (error) throw error
    }

    const getSignedUrl = async (path) => {
    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .createSignedUrl(path, 3600) // expira en 1 hora

    if (error) throw error
    return data.signedUrl
    }

module.exports = { uploadFile, deleteFile, getSignedUrl }



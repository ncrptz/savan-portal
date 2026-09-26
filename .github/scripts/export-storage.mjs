// Export every Supabase Storage bucket to ./backup/storage/<bucket>/<path>.
// Uses the service-role key (full read) and only Node's built-in fetch (Node 18+).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const h = { Authorization: `Bearer ${KEY}`, apikey: KEY }

async function listBuckets() {
  const r = await fetch(`${URL}/storage/v1/bucket`, { headers: h })
  if (!r.ok) throw new Error(`list buckets: ${r.status} ${await r.text()}`)
  return r.json()
}

// Recursively list every object path in a bucket. Folders come back with a
// null id/metadata — we recurse into those; real files we collect.
async function listAll(bucket, prefix = '') {
  const out = []
  const limit = 100
  let offset = 0
  for (;;) {
    const r = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!r.ok) throw new Error(`list ${bucket}/${prefix}: ${r.status} ${await r.text()}`)
    const items = await r.json()
    if (!items.length) break
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name
      if (it.id === null || it.metadata === null) out.push(...await listAll(bucket, path))
      else out.push(path)
    }
    if (items.length < limit) break
    offset += limit
  }
  return out
}

async function download(bucket, path, dest) {
  const r = await fetch(`${URL}/storage/v1/object/${bucket}/${encodeURI(path)}`, { headers: h })
  if (!r.ok) throw new Error(`download ${bucket}/${path}: ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, buf)
}

const buckets = await listBuckets()
let total = 0
for (const b of buckets) {
  const paths = await listAll(b.name)
  for (const p of paths) {
    await download(b.name, p, join('backup', 'storage', b.name, p))
    total++
  }
  console.log(`bucket ${b.name}: ${paths.length} objects`)
}
console.log(`Total objects backed up: ${total}`)

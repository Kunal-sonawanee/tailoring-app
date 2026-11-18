import { Hono } from 'hono'

type AppEnv = { Bindings: Env }

const app = new Hono<AppEnv>().basePath('/api')

// Health check: confirms the Worker, D1 database and R2 bucket are all reachable.
// Public on purpose — it returns no shop data.
app.get('/health', async (c) => {
  const [db, files] = await Promise.all([
    c.env.DB.prepare('SELECT 1 AS ok')
      .first<{ ok: number }>()
      .then((r) => r?.ok === 1)
      .catch(() => false),
    c.env.FILES.list({ limit: 1 })
      .then(() => true)
      .catch(() => false),
  ])
  return c.json({ ok: db && files, db, files, time: new Date().toISOString() })
})

app.notFound((c) => c.json({ error: 'not_found' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'server_error' }, 500)
})

export default app

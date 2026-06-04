import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export async function POST(request: Request) {
  // 1. Verify admin session cookie
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')
  if (adminSession?.value !== 'exameve-admin-active') {
    return NextResponse.json({ success: false, error: 'Unauthorized admin session.' }, { status: 401 })
  }

  try {
    const { action, payload } = await request.json()

    if (action === 'get_stats') {
      const usersRes = await pool.query('SELECT count(*) FROM "User"')
      const examsRes = await pool.query('SELECT count(*) FROM "Exam"')
      const sessionsRes = await pool.query('SELECT count(*) FROM "StudySession"')
      const cardsRes = await pool.query('SELECT count(*) FROM "Flashcard"')
      
      // Get active connections count
      const connRes = await pool.query("SELECT count(*) FROM pg_stat_activity")
      
      // Get table statistics (table names & live row counts)
      const tablesRes = await pool.query(
        `SELECT relname as name, n_live_tup as rows 
         FROM pg_stat_user_tables 
         ORDER BY n_live_tup DESC 
         LIMIT 6`
      )

      return NextResponse.json({
        success: true,
        stats: {
          usersCount: parseInt(usersRes.rows[0].count),
          examsCount: parseInt(examsRes.rows[0].count),
          sessionsCount: parseInt(sessionsRes.rows[0].count),
          cardsCount: parseInt(cardsRes.rows[0].count),
          activeConnections: parseInt(connRes.rows[0].count),
          tables: tablesRes.rows
        }
      })
    }

    if (action === 'reindex') {
      // Reindex table for optimization
      await pool.query('REINDEX TABLE "User"')
      await pool.query('REINDEX TABLE "StudySession"')
      return NextResponse.json({ success: true, message: 'Database user & study session indexes successfully optimized.' })
    }

    if (action === 'prune') {
      // Clean up read notifications older than 7 days
      const deleteRes = await pool.query(
        `DELETE FROM "Notification" 
         WHERE "readAt" IS NOT NULL 
         AND "createdAt" < NOW() - INTERVAL '7 days'`
      )
      return NextResponse.json({ 
        success: true, 
        message: `Database pruned successfully. Cleaned up ${deleteRes.rowCount} read notifications.` 
      })
    }

    if (action === 'broadcast') {
      const { message } = payload
      if (!message || !message.trim()) {
        return NextResponse.json({ success: false, error: 'Broadcast message cannot be empty.' }, { status: 400 })
      }
      
      // Insert in-app notification for all users in postgres
      const insertQuery = `
        INSERT INTO "Notification" (id, "userId", type, message, channel, "createdAt", "updatedAt")
        SELECT 
          'system-' || substring(md5(random()::text) from 1 for 12),
          id, 
          'SYSTEM', 
          $1, 
          'IN_APP', 
          NOW(), 
          NOW()
        FROM "User"
      `
      const broadcastRes = await pool.query(insertQuery, [message.trim()])

      return NextResponse.json({ 
        success: true, 
        message: `Broadcast successfully dispatched to ${broadcastRes.rowCount} active users.` 
      })
    }

    if (action === 'add_event') {
      const { title, description, eventDate, type } = payload
      if (!title || !description || !eventDate) {
        return NextResponse.json({ success: false, error: 'Title, description, and event date are required.' }, { status: 400 })
      }
      const insertQuery = `
        INSERT INTO "SystemEvent" (id, title, description, "eventDate", type, "createdAt")
        VALUES (
          'event-' || substring(md5(random()::text) from 1 for 12),
          $1,
          $2,
          $3::timestamp,
          $4,
          NOW()
        )
      `
      await pool.query(insertQuery, [title, description, new Date(eventDate), type || 'GENERAL'])
      return NextResponse.json({ success: true, message: 'System event successfully registered.' })
    }

    if (action === 'get_events') {
      const eventsRes = await pool.query('SELECT * FROM "SystemEvent" ORDER BY "eventDate" ASC LIMIT 10')
      return NextResponse.json({ success: true, events: eventsRes.rows })
    }

    return NextResponse.json({ success: false, error: 'Unknown admin action.' }, { status: 400 })
  } catch (err: any) {
    console.error('[Admin DB API] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Database query operation failed.' }, { status: 500 })
  }
}

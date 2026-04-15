"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

function SetAnchorContent() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [status, setStatus] = useState("Getting your location...")

  useEffect(() => {
    if (!sessionId) { setStatus("❌ Invalid link — no session ID."); return }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus(`Got GPS (±${Math.round(position.coords.accuracy)}m). Saving to database...`)

        const { data, error } = await supabase
          .from("sessions")
          .update({
            teacher_latitude: position.coords.latitude.toString(),
            teacher_longitude: position.coords.longitude.toString(),
            teacher_accuracy: position.coords.accuracy
          })
          .eq("session_id", sessionId)
          .select()                       // ← KEY CHANGE: returns updated rows

        if (error) {
          setStatus(`❌ Database error: ${error.message}`)
          return
        }

        if (!data || data.length === 0) {
          // Update returned 0 rows — RLS blocked it OR session not found
          setStatus(`❌ Could not update session.\n\nThe session may have ended, or the database is blocking the update.\n\nSession ID: ${sessionId}`)
          return
        }

        // Real success
        setStatus(`✅ Location saved to database!\n\nAccuracy: ±${Math.round(position.coords.accuracy)}m\nLat: ${position.coords.latitude.toFixed(6)}\nLng: ${position.coords.longitude.toFixed(6)}\n\nYou can close this page.`)
      },
      (err) => setStatus(`❌ Location access denied: ${err.message}\n\nAllow GPS in browser settings and reload.`),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }, [sessionId])

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 24, background: "#f0f4ff" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40,
        maxWidth: 400, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1F3864", marginBottom: 16 }}>
          Set Class Location
        </h1>
        <p style={{ fontSize: 16, color: "#444", whiteSpace: "pre-line" }}>{status}</p>
      </div>
    </main>
  )
}

export default function SetAnchorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <SetAnchorContent />
    </Suspense>
  )
}

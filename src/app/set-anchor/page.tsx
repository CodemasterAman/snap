"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function SetAnchorPage() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [status, setStatus] = useState("Getting your location...")

  useEffect(() => {
    if (!sessionId) { setStatus("Invalid link."); return }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase
          .from("sessions")
          .update({
            teacher_latitude: position.coords.latitude.toString(),
            teacher_longitude: position.coords.longitude.toString(),
            teacher_accuracy: position.coords.accuracy
          })
          .eq("session_id", sessionId)

        if (error) {
          setStatus("Failed to update location. Try again.")
        } else {
          setStatus(`✅ Location set successfully!\nAccuracy: ±${Math.round(position.coords.accuracy)}m\n\nYou can close this page.`)
        }
      },
      () => setStatus("❌ Location access denied. Please allow GPS and try again."),
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


"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Fingerprint, QrCode, MapPin, Clock, Send, CheckCircle, Loader2 } from "lucide-react"

type AppState = "VERIFYING" | "READY_TO_SCAN" | "SCANNING" | "SCANNED" | "SENDING" | "SENT"

type AttendanceData = {
  name: string
  regNumber: string
  location: string
  timestamp: Date
}

const VerifyingComponent = () => (
  <Card className="text-center animate-fade-in shadow-lg">
    <CardHeader>
      <div className="flex justify-center mb-4">
        <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <CardTitle className="font-headline">Verification Required</CardTitle>
      <CardDescription>Simulating on-device biometric check...</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Please wait while we verify your identity.</p>
    </CardContent>
  </Card>
)

const ReadyToScanComponent = ({ onScan }: { onScan: () => void }) => (
  <Card className="text-center shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline text-primary">Welcome, Jane Doe</CardTitle>
      <CardDescription>REG-ID: B-TECH-23-12345</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-6">Ready to mark your presence?</p>
      <Button size="lg" className="w-full text-lg h-14" onClick={onScan}>
        <QrCode className="mr-3 h-6 w-6" />
        Mark My Presence
      </Button>
    </CardContent>
    <CardFooter className="justify-center text-xs text-muted-foreground">
        <p>Ensure you scan the QR code within 5 seconds.</p>
    </CardFooter>
  </Card>
)

const ScanningComponent = () => (
  <Card className="text-center shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline">Scan QR Code</CardTitle>
      <CardDescription>Point your camera at the teacher's screen.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="aspect-square bg-muted rounded-lg w-full flex items-center justify-center overflow-hidden relative">
        <div className="w-64 h-64 border-4 border-dashed border-primary/50 rounded-xl"></div>
        <div className="absolute top-0 bottom-0 w-full h-full overflow-hidden">
            <div className="h-full w-1 bg-primary/50 shadow-[0_0_15px_2px_hsl(var(--primary))] animate-scan absolute left-1/2 -translate-x-1/2"></div>
        </div>
        <QrCode className="absolute h-16 w-16 text-primary/20" />
      </div>
    </CardContent>
  </Card>
)

const ScannedComponent = ({ data, onSend, onCancel, sending }: { data: AttendanceData, onSend: () => void, onCancel: () => void, sending?: boolean }) => (
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline text-green-500">Scan Successful</CardTitle>
      <CardDescription>Please verify and send your attendance data.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <p className="font-semibold text-lg">{data.name}</p>
        <p className="text-sm text-muted-foreground">{data.regNumber}</p>
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-2 text-primary" />
          <span>{data.location}</span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2 text-primary" />
          <span>{data.timestamp.toLocaleString()}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={onCancel} disabled={sending}>Scan Again</Button>
        <Button onClick={onSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? 'Sending...' : 'Send Attendance'}
        </Button>
    </CardFooter>
  </Card>
)

const SentComponent = ({ onDone }: { onDone: () => void }) => (
    <Card className="text-center shadow-lg">
        <CardHeader>
            <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="font-headline">Attendance Marked!</CardTitle>
            <CardDescription>Your presence has been successfully recorded.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button className="w-full" onClick={onDone}>Done</Button>
        </CardContent>
    </Card>
)


export default function DashboardPage() {
  const [appState, setAppState] = useState<AppState>("VERIFYING")
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    switch (appState) {
      case "VERIFYING":
        timer = setTimeout(() => setAppState("READY_TO_SCAN"), 3000)
        break
      case "SCANNING":
        timer = setTimeout(() => {
          setAttendanceData({
            name: "Jane Doe",
            regNumber: "B-TECH-23-12345",
            location: "Main Campus, Hall-03",
            timestamp: new Date(),
          })
          setAppState("SCANNED")
        }, 3000)
        break
      case "SENDING":
        timer = setTimeout(() => setAppState("SENT"), 2000)
        break
    }
    return () => clearTimeout(timer)
  }, [appState])

  const resetState = () => {
    setAttendanceData(null)
    setAppState("READY_TO_SCAN")
  }

  const renderContent = () => {
    switch (appState) {
      case "VERIFYING": return <VerifyingComponent />
      case "READY_TO_SCAN": return <ReadyToScanComponent onScan={() => setAppState("SCANNING")} />
      case "SCANNING": return <ScanningComponent />
      case "SCANNED": return attendanceData && <ScannedComponent data={attendanceData} onSend={() => setAppState("SENDING")} onCancel={() => setAppState('SCANNING')} />
      case "SENDING": return attendanceData && <ScannedComponent data={attendanceData} onSend={() => {}} onCancel={() => {}} sending />
      case "SENT": return <SentComponent onDone={resetState} />
      default: return null
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-headline text-center mb-2 text-primary">VeriPresence</h1>
        <p className="text-center text-muted-foreground mb-8">Secure Student Attendance</p>
        {renderContent()}
      </div>
    </main>
  )
}

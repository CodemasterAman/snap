
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { QrCode, MapPin, Send, CheckCircle, Loader2, LocateFixed, VideoOff, LogOut, AlertCircle, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import jsQR from "jsqr"
import { supabase } from "@/lib/supabaseClient"


type AppState = "READY_TO_SCAN" | "GETTING_LOCATION" | "SCANNING" | "SENDING" | "SENT"

type LocationData = {
  latitude: number;
  longitude: number;
} | null

type QrPayload = {
    qrId: string;
    sessionId: string;
}

type AttendanceData = {
  name: string
  regNumber: string
  phoneNumber: string | null
  scanTimestamp: Date
  qrPayload: QrPayload
}


const ReadyToScanComponent = ({ onScan, userName, regNumber, gettingLocation }: { onScan: () => void, userName: string, regNumber: string, gettingLocation: boolean }) => (
  <Card className="text-center shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline text-primary">Welcome, {userName}</CardTitle>
      <CardDescription>REG-ID: {regNumber}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-6">Ready to mark your presence?</p>
      <Button size="lg" className="w-full text-lg h-14" onClick={onScan} disabled={gettingLocation}>
        {gettingLocation ? (
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
        ) : (
            <QrCode className="mr-3 h-6 w-6" />
        )}
        {gettingLocation ? "Getting Location..." : "Mark My Presence"}
      </Button>
    </CardContent>
    <CardFooter className="justify-center text-xs text-muted-foreground">
        <p>Ensure you have the class QR code ready.</p>
    </CardFooter>
  </Card>
)

const ScanningComponent = ({ onScanSuccess, onScanError, sending }: { onScanSuccess: (data: string) => void, onScanError: (message: string) => void, sending: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const { toast } = useToast();
  const animationFrameId = useRef<number>();

  const tick = useCallback(() => {
    if (sending) return;

    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          try {
            JSON.parse(code.data);
            onScanSuccess(code.data);
            return;
          } catch (e) {
            onScanError("Invalid QR code format. Expected JSON.");
            return;
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [sending, onScanSuccess, onScanError]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported by this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => {
            console.error("Video play failed:", e);
            if (e.name !== 'AbortError') {
              onScanError("Could not start camera. Please check permissions.");
            }
          });
          animationFrameId.current = requestAnimationFrame(tick);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to scan the QR code.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="text-center shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Scan QR Code</CardTitle>
        <CardDescription>Point your camera at the teacher's screen.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-muted rounded-lg w-full flex items-center justify-center overflow-hidden relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {hasCameraPermission ? (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-4 border-dashed border-primary/50 rounded-xl"></div>
              </div>
              <div className="absolute top-0 bottom-0 w-full h-full overflow-hidden rounded-lg">
                  <div className="h-full w-1.5 bg-primary/70 shadow-[0_0_20px_4px_hsl(var(--primary))] animate-scan absolute"></div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                <VideoOff className="h-12 w-12 mb-4" />
                <p className="font-semibold">Camera permission denied</p>
                <p className="text-sm">Please enable camera access in your browser settings.</p>
            </div>
          )}
           {sending && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p className="text-lg font-semibold">Sending Attendance...</p>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  )
}

const SentComponent = ({ onDone, message, success }: { onDone: () => void, message: string, success: boolean }) => (
    <Card className="text-center shadow-lg">
        <CardHeader>
            <div className="flex justify-center mb-4">
                {success ? (
                    <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                    <AlertCircle className="h-16 w-16 text-destructive" />
                )}
            </div>
            <CardTitle className="font-headline">{success ? 'Attendance Marked!' : 'Submission Failed'}</CardTitle>
            <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button className="w-full" onClick={onDone}>Done</Button>
        </CardContent>
    </Card>
)

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const [appState, setAppState] = useState<AppState>("READY_TO_SCAN")
  const [location, setLocation] = useState<LocationData>(null)
  const [submissionResult, setSubmissionResult] = useState<{message: string, success: boolean} | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const auth = useAuth()
  const user = useUser()
  const [userName, setUserName] = useState("Student");
  const [regNumber, setRegNumber] = useState("");

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    } else if (user) {
       const name = (user.displayName || "Student").split(' ')[0];
       setUserName(name);
       
       if (user.email) {
         const match = user.email.match(/\.([a-zA-Z0-9]+)@/);
         if (match && match[1]) {
           setRegNumber(match[1].toUpperCase());
         }
       }
    }
  }, [user, router]);


  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred during logout. Please try again.",
      });
    }
  };


  const handleMarkPresence = () => {
    if (navigator.geolocation) {
        setAppState("GETTING_LOCATION");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                toast({
                  title: "Location Acquired",
                  description: "Your location has been successfully recorded.",
                })
                setAppState("SCANNING");
            },
            (error) => {
                console.error("Error getting location:", error);
                toast({
                    variant: "destructive",
                    title: "Location Error",
                    description: "Could not retrieve your location. Please enable location services and try again.",
                });
                resetState();
            }
        );
    } else {
        toast({
            variant: "destructive",
            title: "Location Error",
            description: "Geolocation is not supported by your browser.",
        });
    }
  };
  
  const handleSendAttendance = async (qrData: string) => {
    if (!location || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'User or location data is missing.' });
        resetState();
        return;
    }

    try {
      const qrPayload: QrPayload = JSON.parse(qrData);
      if (!qrPayload.qrId || !qrPayload.sessionId) {
          throw new Error("QR code is missing 'qrId' or 'sessionId'.");
      }

      setAppState("SENDING");

      const { data, error } = await supabase.rpc('submit_attendance', {
        p_qr_id: qrPayload.qrId,
        p_session_id: qrPayload.sessionId,
        p_student_name: userName,
        p_student_email: user.email,
        p_student_phone: user.phoneNumber,
        p_student_latitude: location.latitude,
        p_student_longitude: location.longitude,
        p_scan_timestamp: new Date().toISOString()
      })

      if (error) {
        throw new Error(error.message)
      }
      
      setSubmissionResult({ message: data.message, success: data.success });
      setAppState("SENT");

    } catch (err: any) {
        console.error("Submission Error:", err);
        setSubmissionResult({ message: err.message || "A network error occurred. Please try again.", success: false });
        setAppState("SENT"); 
    }
  };

  const handleScanError = (message: string) => {
    toast({
        variant: 'destructive',
        title: 'QR Scan Error',
        description: message,
    });
    resetState();
  }

  const resetState = () => {
    setLocation(null)
    setSubmissionResult(null)
    setAppState("READY_TO_SCAN")
  }
  
  if (!user) {
    return <DashboardSkeleton />;
  }

  const renderContent = () => {
    switch (appState) {
      case "READY_TO_SCAN": 
      case "GETTING_LOCATION":
        return <ReadyToScanComponent onScan={handleMarkPresence} userName={userName} regNumber={regNumber} gettingLocation={appState === 'GETTING_LOCATION'} />
      case "SCANNING":
      case "SENDING":
        return <ScanningComponent onScanSuccess={handleSendAttendance} onScanError={handleScanError} sending={appState === 'SENDING'} />
      case "SENT": 
        return submissionResult && <SentComponent onDone={resetState} message={submissionResult.message} success={submissionResult.success}/>
      default: return null
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto relative">
        <Button variant="ghost" size="sm" className="absolute top-0 right-0 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <h1 className="text-4xl font-headline text-center mb-2 text-primary">Snap</h1>
        <p className="text-center text-muted-foreground mb-8">Your daily check-in.</p>
        {renderContent()}
      </div>
    </main>
  )
}

    

"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { QrCode, MapPin, Clock, Send, CheckCircle, Loader2, LocateFixed, VideoOff, LogOut, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import jsQR from "jsqr"


type AppState = "READY_TO_SCAN" | "SCANNING" | "SCANNED" | "SENDING" | "SENT"

type LocationData = {
  latitude: number;
  longitude: number;
}

type QrPayload = {
    qrId: string;
    sessionId: string;
}

type AttendanceData = {
  name: string
  regNumber: string
  phoneNumber: string | null
  location: LocationData
  timestamp: Date
  qrPayload: QrPayload
}

const ReadyToScanComponent = ({ onScan, userName }: { onScan: () => void, userName: string }) => (
  <Card className="text-center shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline text-primary">Welcome, {userName}</CardTitle>
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
        <p>Ensure you have the class QR code ready.</p>
    </CardFooter>
  </Card>
)

const ScanningComponent = ({ onScanSuccess, onScanError }: { onScanSuccess: (data: string) => void, onScanError: (message: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const { toast } = useToast();
  const animationFrameId = useRef<number>();

  const tick = useCallback(() => {
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
            // Attempt to parse the QR code data as JSON
            JSON.parse(code.data);
            onScanSuccess(code.data);
            return; // Stop scanning on success
          } catch (e) {
            onScanError("Invalid QR code format. Expected JSON.");
            return; // Stop scanning on error
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported by this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
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
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [toast, tick]);

  return (
    <Card className="text-center shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Scan QR Code</CardTitle>
        <CardDescription>Point your camera at the teacher's screen.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-muted rounded-lg w-full flex items-center justify-center overflow-hidden relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline />
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
        </div>
      </CardContent>
    </Card>
  )
}


const ScannedComponent = ({ data, onSend, onCancel, sending, onGetLocation }: { data: AttendanceData, onSend: () => void, onCancel: () => void, sending?: boolean, onGetLocation: () => void }) => {
  const [formattedTimestamp, setFormattedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    // This now only runs on the client, avoiding the mismatch.
    setFormattedTimestamp(new Date(data.timestamp).toLocaleString());
  }, [data.timestamp]);

  return (
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="font-headline text-green-500">Scan Successful</CardTitle>
      <CardDescription>Please verify and send your attendance data.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <p className="font-semibold text-lg">{data.name}</p>
        <p className="text-sm text-muted-foreground">{data.regNumber}</p>
        {data.phoneNumber && (
            <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 text-primary" />
                <span>{data.phoneNumber}</span>
            </div>
        )}
        <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                {data.location.latitude !== 0 ? (
                    <span>{data.location.latitude.toFixed(4)}, {data.location.longitude.toFixed(4)}</span>
                ) : (
                    <span className="text-muted-foreground">Location not set</span>
                )}
            </div>
            <Button variant="ghost" size="sm" onClick={onGetLocation}>
                <LocateFixed className="mr-2 h-4 w-4"/> Get Location
            </Button>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2 text-primary" />
          <span>{formattedTimestamp || 'Loading...'}</span>
        </div>
         <div className="flex items-center text-sm pt-2 border-t border-border">
          <QrCode className="h-4 w-4 mr-2 text-primary" />
          <span className="font-mono text-xs truncate">Session: {data.qrPayload.sessionId}</span>
        </div>
      </div>
       {data.location.latitude === 0 && (
         <Alert variant="destructive">
            <AlertTitle>Location Required</AlertTitle>
            <AlertDescription>
                Please provide your location before sending attendance.
            </AlertDescription>
         </Alert>
       )}
    </CardContent>
    <CardFooter className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={onCancel} disabled={sending}>Scan Again</Button>
        <Button onClick={onSend} disabled={sending || data.location.latitude === 0}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? 'Sending...' : 'Send Attendance'}
        </Button>
    </CardFooter>
  </Card>
  )
}

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
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const auth = useAuth()
  const user = useUser()
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    } else if (user) {
       const name = user.displayName || user.email?.split('@')[0] || "Student";
       setUserName(name);
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


  const handleGetLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setAttendanceData((prevData) => {
                    if (!prevData) return null;
                    return {
                        ...prevData,
                        location: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        },
                    };
                });
                toast({
                  title: "Location Acquired",
                  description: "Your location has been successfully recorded.",
                })
            },
            (error) => {
                console.error("Error getting location:", error);
                toast({
                    variant: "destructive",
                    title: "Location Error",
                    description: "Could not retrieve your location. Please enable location services.",
                });
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
  
    const handleSendAttendance = async () => {
        if (!attendanceData || !user) return;
        setAppState("SENDING");
    
        const payload = {
            p_session_id: attendanceData.qrPayload.sessionId,
            p_student_name: attendanceData.name,
            p_student_email: user.email,
            p_student_phone: attendanceData.phoneNumber,
            p_student_latitude: attendanceData.location.latitude,
            p_student_longitude: attendanceData.location.longitude,
            p_scan_timestamp: new Date().toISOString(),
        };

        try {
            // This is a placeholder. Replace with your actual API endpoint.
            const response = await fetch('/api/verify-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Verification failed.');
            }

            // const result = await response.json();
            // console.log('Verification success:', result);
            setAppState("SENT");

        } catch (error: any) {
            console.error("Error sending attendance:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error.message || "Could not send attendance data. Please try again.",
            });
            // Go back to the scanned state on failure to allow retry
            setAppState("SCANNED"); 
        }
    };


  const handleScanSuccess = (qrData: string) => {
     if (user) {
        try {
            const qrPayload: QrPayload = JSON.parse(qrData);
            if (!qrPayload.qrId || !qrPayload.sessionId) {
                throw new Error("QR code is missing 'qrId' or 'sessionId'.");
            }
            setAttendanceData({
              name: user.displayName || user.email || "Student",
              regNumber: "B-TECH-23-12345",
              phoneNumber: user.phoneNumber,
              location: { latitude: 0, longitude: 0 },
              timestamp: new Date(),
              qrPayload: qrPayload,
            });
            setAppState("SCANNED");
        } catch (error: any) {
            handleScanError(error.message || "Failed to parse QR code.");
        }
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
    setAttendanceData(null)
    setAppState("READY_TO_SCAN")
  }
  
  if (!user) {
    return <DashboardSkeleton />;
  }

  const renderContent = () => {
    switch (appState) {
      case "READY_TO_SCAN": return <ReadyToScanComponent onScan={() => setAppState("SCANNING")} userName={userName} />
      case "SCANNING": return <ScanningComponent onScanSuccess={handleScanSuccess} onScanError={handleScanError} />
      case "SCANNED": return attendanceData && <ScannedComponent data={attendanceData} onSend={handleSendAttendance} onCancel={resetState} onGetLocation={handleGetLocation} />
      case "SENDING": return attendanceData && <ScannedComponent data={attendanceData} onSend={() => {}} onCancel={() => {}} sending onGetLocation={() => {}} />
      case "SENT": return <SentComponent onDone={resetState} />
      default: return null
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto relative">
        <Button variant="ghost" size="sm" className="absolute top-0 right-0 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <h1 className="text-4xl font-headline text-center mb-2 text-primary">SNAP</h1>
        <p className="text-center text-muted-foreground mb-8">Your daily check-in.</p>
        {renderContent()}
      </div>
    </main>
  )
}

    
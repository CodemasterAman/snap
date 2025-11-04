
"use client"

import React, from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { QrCode, Send, CheckCircle, Loader2, VideoOff, LogOut, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import jsQR from "jsqr"
import { supabase } from "@/lib/supabaseClient"


/*
  ACTION REQUIRED: The `submit_attendance` function does not exist in your Supabase project.

  Please go to your Supabase SQL Editor and run the following SQL.
  This will create the database function your app needs and resolve the "function not found" error.

  -- 1. Create the students table
  CREATE TABLE public.students (
      id UUID PRIMARY KEY,
      registration_number TEXT UNIQUE,
      full_name TEXT,
      email TEXT UNIQUE,
      phone_number TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Create the attendance sessions and records tables
  CREATE TABLE public.attendance_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      qr_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      class_id TEXT,
      teacher_id TEXT
  );

  CREATE TABLE public.attendance_records (
      id BIGSERIAL PRIMARY KEY,
      session_id UUID REFERENCES public.attendance_sessions(id),
      student_id UUID REFERENCES public.students(id),
      scan_timestamp TIMESTAMPTZ NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(session_id, student_id)
  );

  -- 3. Create the submit_attendance function
  CREATE OR REPLACE FUNCTION public.submit_attendance(
      p_session_id UUID,
      p_student_id UUID,
      p_latitude DOUBLE PRECISION,
      p_longitude DOUBLE PRECISION,
      p_qr_id TEXT,
      p_scan_timestamp TIMESTAMPTZ
  )
  RETURNS TABLE(success BOOLEAN, message TEXT)
  LANGUAGE plpgsql
  AS $$
  DECLARE
      v_session RECORD;
      v_already_marked BOOLEAN;
  BEGIN
      -- Find the active session
      SELECT * INTO v_session
      FROM public.attendance_sessions
      WHERE id = p_session_id AND qr_id = p_qr_id AND expires_at > NOW();

      -- If no active session is found
      IF NOT FOUND THEN
          RETURN QUERY SELECT FALSE, 'Invalid or expired QR code.';
          RETURN;
      END IF;

      -- Check if attendance is already marked for this session
      SELECT EXISTS (
          SELECT 1 FROM public.attendance_records
          WHERE session_id = p_session_id AND student_id = p_student_id
      ) INTO v_already_marked;

      IF v_already_marked THEN
          RETURN QUERY SELECT FALSE, 'Attendance already marked for this session.';
          RETURN;
      END IF;

      -- Insert the new attendance record
      INSERT INTO public.attendance_records (session_id, student_id, scan_timestamp, latitude, longitude)
      VALUES (p_session_id, p_student_id, p_scan_timestamp, p_latitude, p_longitude);

      RETURN QUERY SELECT TRUE, 'Attendance marked successfully!';

  EXCEPTION
      WHEN OTHERS THEN
          RETURN QUERY SELECT FALSE, 'An unexpected database error occurred.';
  END;
  $$;

*/


type AppState = "READY_TO_SCAN" | "GETTING_LOCATION" | "SCANNING" | "SENDING" | "SENT"

type LocationData = {
  latitude: number;
  longitude: number;
} | null

type QrPayload = {
    qrId: string;
    sessionId: string;
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
  const animationFrameId = useRef<number>();
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  const tick = useCallback(() => {
    if (sending || !videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        if (!sending) {
            animationFrameId.current = requestAnimationFrame(tick);
        }
        return;
    }
  
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
        JSON.parse(code.data); // Validate JSON format
        onScanSuccess(code.data);
        return; // Stop scanning on success
        } catch (e) {
        onScanError("Invalid QR code format. Expected JSON.");
        return; // Stop scanning on error
        }
    }
    }
    
    animationFrameId.current = requestAnimationFrame(tick);
  }, [sending, onScanSuccess, onScanError]);


  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    const getCameraPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported by this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);

        if (videoElement) {
          videoElement.srcObject = stream;
          // Use onloadedmetadata to ensure the stream is ready
          videoElement.onloadedmetadata = () => {
             videoElement.play().catch(e => {
                console.error("Video play failed:", e);
                // Don't call onScanError here as it might create a loop
             });
             animationFrameId.current = requestAnimationFrame(tick);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        onScanError('Camera permission denied. Please enable it in your browser settings.');
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
      if (videoElement) {
        // Clean up video element properties
        videoElement.srcObject = null;
        videoElement.onloadedmetadata = null;
      }
    };
  }, [tick, onScanError]);

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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) { // Still loading
      return;
    } 
    if (!user) { // Not logged in
      router.push("/login");
      return;
    }

    // User is logged in
    if (!user.displayName) { // New user, profile not complete
       router.push('/complete-profile');
       return;
    }
    
    const name = user.displayName ? user.displayName.split(' ')[0] : "Student";
    setUserName(name);
   
    if (user.email) {
     const match = user.email.match(/\.([a-zA-Z0-9]+)@/);
     if (match && match[1]) {
       setRegNumber(match[1].toUpperCase());
     }
    }

    // Fetch phone number from students table
    const fetchProfile = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('phone_number')
            .eq('id', user.uid)
            .single();

        if (error) {
          console.error("Error fetching profile:", error.message)
        } else if (data) {
            setPhoneNumber(data.phone_number);
        }
    };
    fetchProfile();

  }, [user, router]);


  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      const cooldownUntil = new Date().getTime() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem('logoutCooldownUntil', cooldownUntil.toString());
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
    if (!location || !user || !user.email || !user.displayName) {
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
      
      const payload = {
        p_qr_id: qrPayload.qrId,
        p_session_id: qrPayload.sessionId,
        p_student_id: user.uid,
        p_student_name: user.displayName || null,
        p_student_email: user.email || null,
        p_student_phone: phoneNumber || null,
        p_student_latitude: location.latitude,
        p_student_longitude: location.longitude,
        p_scan_timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.rpc('submit_attendance', payload);


      if (error) {
        throw new Error(error.message)
      }
      
      if (!data || data.length === 0) {
        throw new Error("No response from submission function.")
      }
      
      const result = Array.isArray(data) ? data[0] : data;

      setSubmissionResult({ message: result.message, success: result.success });
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
  
  if (!user || !user.displayName) {
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

    

"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { User, Loader2, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@/firebase"
import { updateProfile } from "firebase/auth"
import { supabase } from "@/lib/supabaseClient"


/*
  ================================================================================
  CRITICAL ACTION REQUIRED: YOUR APP WILL NOT WORK UNTIL YOU DO THIS
  ================================================================================

  The error "Could not find the table 'public.students'" means your database is missing
  the required tables. I cannot create these for you. You MUST run the following SQL
  script in your Supabase project to fix the application.

  HOW TO FIX:
  1. Go to your Supabase project dashboard.
  2. In the left menu, click on "SQL Editor".
  3. Click "New query".
  4. Copy the entire SQL script below and paste it into the editor.
  5. Click the "RUN" button.

  --- COPY THE SQL BELOW THIS LINE ---

  -- 1. Create the students table
  CREATE TABLE IF NOT EXISTS public.students (
      id UUID PRIMARY KEY,
      registration_number TEXT UNIQUE,
      full_name TEXT,
      email TEXT UNIQUE,
      phone_number TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. Create the attendance sessions and records tables
  CREATE TABLE IF NOT EXISTS public.attendance_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      qr_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      class_id TEXT,
      teacher_id TEXT
  );

  CREATE TABLE IF NOT EXISTS public.attendance_records (
      id BIGSERIAL PRIMARY KEY,
      session_id UUID REFERENCES public.attendance_sessions(id),
      student_id UUID REFERENCES public.students(id),
      scan_timestamp TIMESTAMPTZ NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(session_id, student_id)
  );

  -- 3. Create the NEW submit_attendance function that accepts name and email
  CREATE OR REPLACE FUNCTION public.submit_attendance(
      p_session_id UUID,
      p_student_id UUID,
      p_latitude DOUBLE PRECISION,
      p_longitude DOUBLE PRECISION,
      p_qr_id TEXT,
      p_scan_timestamp TIMESTAMPTZ,
      p_full_name TEXT,
      p_email TEXT
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

      -- Ensure student record exists
      INSERT INTO public.students (id, full_name, email)
      VALUES (p_student_id, p_full_name, p_email)
      ON CONFLICT (id) DO NOTHING;

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


const formSchema = z.object({
  fullName: z.string().min(2, { message: "Please enter your full name." }),
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
})

function CompleteProfileForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const auth = useAuth()
  const user = useUser()
  const router = useRouter()
  const [regNumber, setRegNumber] = useState("");
  const [fullName, setFullName] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  })

  useEffect(() => {
    if (user === null) {
        // Still loading or not logged in, wait.
    } else if (!user) {
      router.push("/login")
    } else if (user) {
        if (user.displayName) { // If profile is already complete, redirect to dashboard
            router.push('/dashboard');
        }
        if (user.email) {
            const emailParts = user.email.split('@')[0].split('.');
            if (emailParts.length === 2) {
                const name = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
                const reg = emailParts[1].toUpperCase();
                setFullName(name);
                setRegNumber(reg);
                form.setValue('fullName', name); // pre-fill the form
            }
        }
    }
  }, [user, router, form])

  async function handleProfileUpdate(values: z.infer<typeof formSchema>) {
    if (!auth || !user || !user.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to update your profile.",
      });
      return;
    }
    setIsLoading(true)
    try {
      // 1. Update Firebase Auth display name
      await updateProfile(user, {
        displayName: values.fullName,
      });

      // 2. Save details to Supabase database
      const { error: supabaseError } = await supabase
        .from('students')
        .upsert({ 
            id: user.uid, 
            full_name: values.fullName,
            phone_number: values.phoneNumber,
            email: user.email,
            registration_number: regNumber, // Pass the detected reg number
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }


      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!user) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Complete Your Profile</CardTitle>
          <CardDescription>
            Please fill in your details to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. John Doe" {...field} className="pl-10" disabled />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="tel" placeholder="e.g. 9876543210" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Your student details:</p>
                <ul className="list-disc list-inside bg-muted/50 p-3 rounded-md border">
                    <li><strong>Email:</strong> {user.email}</li>
                    <li><strong>Registration No:</strong> {regNumber || "Detecting..."}</li>
                </ul>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save and Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  )
}


export default function CompleteProfilePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
        <CompleteProfileForm />
    </main>
  )
}

    
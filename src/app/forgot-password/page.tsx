
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { User, KeyRound, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

const studentIdSchema = z.object({
  studentId: z.string().min(1, { message: "Student ID is required." }),
})

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
})

type Step = "enter-id" | "enter-otp"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("enter-id")
  const [studentId, setStudentId] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const studentIdForm = useForm<z.infer<typeof studentIdSchema>>({
    resolver: zodResolver(studentIdSchema),
    defaultValues: { studentId: "" },
  })

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

  function handleStudentIdSubmit(values: z.infer<typeof studentIdSchema>) {
    // In a real app, you'd send an OTP here.
    console.log("Sending OTP to student ID:", values.studentId)
    setStudentId(values.studentId)
    setStep("enter-otp")
    toast({
      title: "OTP Sent",
      description: "An OTP has been sent to your registered email address.",
    })
  }

  function handleOtpSubmit(values: z.infer<typeof otpSchema>) {
    // In a real app, you'd verify the OTP and allow password reset.
    console.log("Verifying OTP:", values.otp, "for student ID:", studentId)
    toast({
      title: "Success",
      description: "Password has been reset. Please login.",
    })
    router.push("/login")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Forgot Password</CardTitle>
          <CardDescription>
            {step === "enter-id"
              ? "Enter your Student ID to receive an OTP."
              : "Enter the 6-digit OTP sent to your email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "enter-id" ? (
            <Form {...studentIdForm}>
              <form onSubmit={studentIdForm.handleSubmit(handleStudentIdSubmit)} className="space-y-6">
                <FormField
                  control={studentIdForm.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Your official student ID" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Send OTP
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="123456" {...field} className="pl-10 tracking-[0.3em] text-center" maxLength={6} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Verify OTP & Reset
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
            <Button type="button" variant="link" size="sm" className="text-muted-foreground font-normal px-0 h-auto py-0" asChild>
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

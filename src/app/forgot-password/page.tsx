
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { User, ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useAuth } from "@/firebase"
import { sendPasswordResetEmail, AuthError } from "firebase/auth"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
})

function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { toast } = useToast()
  const auth = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  async function handlePasswordResetSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication service is not available. Please try again later.",
      });
      return;
    }
    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, values.email)
      setEmailSent(true)
    } catch (error: any) {
      const authError = error as AuthError;
      let errorMessage = "Failed to send password reset email. Please try again."
      if (authError.code === 'auth/user-not-found') {
          errorMessage = "No account found with this email address."
      } else if (authError.message) {
          errorMessage = authError.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
        <Card className="w-full max-w-sm shadow-2xl border-none">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <MailCheck className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-3xl font-headline text-primary">Check Your Email</CardTitle>
                <CardDescription>
                A password reset link has been sent to the email address you provided.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Please follow the instructions in the email to reset your password.
                </p>
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
    )
  }
  
  return (
    <Card className="w-full max-w-sm shadow-2xl border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePasswordResetSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID (Email)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input suppressHydrationWarning placeholder="your.id@university.edu" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading} suppressHydrationWarning>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Link
              </Button>
            </form>
          </Form>
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
  )
}


export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
        <ForgotPasswordForm />
    </main>
  )
}

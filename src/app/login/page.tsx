
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { LogIn, User, Lock, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useAuth } from "@/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError, updateProfile } from "firebase/auth"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const cooldownUntil = localStorage.getItem('logoutCooldownUntil');
    const now = new Date().getTime();

    if (cooldownUntil && now < parseInt(cooldownUntil)) {
        const remainingTime = Math.ceil((parseInt(cooldownUntil) - now) / (1000 * 60));
        toast({
            variant: "destructive",
            title: "Login Cooldown",
            description: `Please wait ${remainingTime} more minute(s) before logging in again.`,
        });
        return;
    }
    
    setIsLoading(true);
    try {
      // First, try to sign in
      await signInWithEmailAndPassword(auth, values.email, values.password);
      localStorage.removeItem('logoutCooldownUntil');
      router.push('/dashboard');
    } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/user-not-found') {
            // If user not found, create a new user (sign up)
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
                const user = userCredential.user;
                // You can extract the name from the email or have a separate field for it.
                const nameFromEmail = values.email.split('@')[0].split('.')[0];
                const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
                
                await updateProfile(user, {
                  displayName: capitalizedName,
                  // The phone number needs to be verified, so we can't set it directly here
                });

                toast({
                    title: "Account Created",
                    description: "Welcome! Your account has been successfully created.",
                });
                localStorage.removeItem('logoutCooldownUntil');
                router.push('/dashboard');
            } catch (signUpError) {
                const signUpAuthError = signUpError as AuthError;
                toast({
                    variant: "destructive",
                    title: "Sign Up Failed",
                    description: signUpAuthError.message || "An unexpected error occurred.",
                });
            }
        } else if (authError.code === "auth/invalid-credential") {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid email or password. Please try again.",
            });
        }
        
        else {
            // Handle other sign-in errors
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: authError.message || "An unexpected error occurred. Please try again.",
            });
        }
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student ID (Email)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="your.id@university.edu" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          {isLoading ? 'Please wait...' : 'Login or Sign Up'}
        </Button>
        <div className="text-center">
             <Button type="button" variant="link" size="sm" className="text-muted-foreground font-normal px-0 h-auto py-0" asChild>
                <Link href="/forgot-password">
                    Forgot Password?
                </Link>
            </Button>
        </div>
      </form>
    </Form>
  )
}

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])


  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">SNAP</CardTitle>
          <CardDescription>Your daily check-in.</CardDescription>
        </CardHeader>
        <CardContent>
          {isClient ? <LoginForm /> : <div className="h-[258px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground justify-center">
          <p>Login with your official university credentials. New users are automatically registered.</p>
        </CardFooter>
      </Card>
    </main>
  )
}

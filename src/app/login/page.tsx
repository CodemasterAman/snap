
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { LogIn, User, Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  studentId: z.string().min(1, { message: "Student ID is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
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
    
    // In a real app, you'd authenticate the user here.
    console.log(values)
    localStorage.removeItem('logoutCooldownUntil');
    router.push('/dashboard')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-6">
            <FormField
              control={form.control}
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
        <Button type="submit" className="w-full">
          <LogIn className="mr-2 h-4 w-4" />
          Login & Verify
        </Button>
        <div className="text-center">
             <Button type="button" variant="link" size="sm" className="text-muted-foreground font-normal px-0 h-auto py-0">
                Forgot Password?
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
          {isClient ? <LoginForm /> : null}
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground justify-center">
          <p>Login with your official university credentials.</p>
        </CardFooter>
      </Card>
    </main>
  )
}

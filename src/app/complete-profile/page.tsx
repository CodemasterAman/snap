
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { User, Loader2, Phone, Fingerprint } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@/firebase"
import { updateProfile } from "firebase/auth"

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  async function handleProfileUpdate(values: z.infer<typeof formSchema>) {
    if (!auth || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to update your profile.",
      });
      return;
    }
    setIsLoading(true)
    try {
      await updateProfile(user, {
        displayName: values.fullName,
        // The ability to update phone number this way requires more complex Firebase setup
        // For now we will just update the display name.
      });

      // You can add logic here to save phone number and registration number to Firestore
      // if you have a database set up.

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
                        <Input placeholder="e.g. John Doe" {...field} className="pl-10" />
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
              <p className="text-sm text-muted-foreground">
                Registration number and Student ID are automatically detected from your email.
              </p>
              
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

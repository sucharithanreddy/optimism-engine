import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Start Your Journey
          </h1>
          <p className="text-gray-600">
            Create an account to transform your thoughts
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white/80 backdrop-blur-lg shadow-xl border border-blue-100",
              headerTitle: "text-blue-600",
              headerSubtitle: "text-gray-500",
              socialButtonsBlockButton: "bg-white border border-gray-200 hover:bg-gray-50",
              socialButtonsBlockButtonText: "text-gray-700",
              formButtonPrimary: "bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600",
              footerActionLink: "text-blue-600 hover:text-blue-700",
            }
          }}
          signInUrl="/sign-in"
        />
      </div>
    </div>
  )
}

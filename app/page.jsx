import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">BidWinnerAI</span>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <Link href="/sign-in">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Sign Up</Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1">
        <section className="py-20 px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Don't write from scratch.
            <br />
            Write from your best wins.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Cut proposal time by 80%. Upload your winning proposals and let AI help you write winning RFPs and grant applications.
          </p>
          <div className="flex justify-center gap-4">
            <SignedOut>
              <Link href="/sign-up">
                <Button size="lg">Get Started</Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            </SignedIn>
          </div>
        </section>

        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Your Wins</h3>
                <p className="text-gray-600">
                  Upload your last 10 winning proposals and company case studies.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Indexes Everything</h3>
                <p className="text-gray-600">
                  Our AI processes and indexes your documents using MongoDB Vector Search.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Write Winning Proposals</h3>
                <p className="text-gray-600">
                  Paste new RFP requirements and get AI-powered responses based on your past wins.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-4">$0</p>
                <ul className="text-left space-y-2 mb-6">
                  <li>5 documents</li>
                  <li>Basic AI features</li>
                  <li>Limited chat history</li>
                </ul>
                <Button variant="outline" className="w-full">Current Plan</Button>
              </div>
              <div className="border-2 border-blue-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-3xl font-bold mb-4">$49<span className="text-lg">/mo</span></p>
                <ul className="text-left space-y-2 mb-6">
                  <li>Unlimited documents</li>
                  <li>Advanced AI features</li>
                  <li>Full chat history</li>
                  <li>Priority support</li>
                </ul>
                <Button className="w-full">Upgrade</Button>
              </div>
              <div className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-3xl font-bold mb-4">$99<span className="text-lg">/mo</span></p>
                <ul className="text-left space-y-2 mb-6">
                  <li>Everything in Pro</li>
                  <li>Team collaboration</li>
                  <li>Custom integrations</li>
                  <li>Dedicated support</li>
                </ul>
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

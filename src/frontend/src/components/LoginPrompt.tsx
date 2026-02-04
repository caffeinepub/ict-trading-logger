import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3, FileText, Shield } from 'lucide-react';

export default function LoginPrompt() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            ICT Trading Logger
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional trading journal for ICT methodology practitioners. Track trades, build models, and analyze performance.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={login}
              disabled={isLoggingIn}
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoggingIn ? 'Connecting...' : 'Login to Get Started'}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>Model Builder</CardTitle>
              <CardDescription>
                Create reusable trading models with ICT-inspired configurations including bias, liquidity elements, and entry logic.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle>Trade Logger</CardTitle>
              <CardDescription>
                Log trades with multiple SL/TP legs, track outcomes, and add reflections with emotion tags and chart screenshots.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive performance metrics, equity curves, win rates, and model-specific analytics to improve your trading.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">Secure & Private</CardTitle>
            </div>
            <CardDescription>
              Your trading data is stored securely on the Internet Computer blockchain. Only you have access to your trades and models.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

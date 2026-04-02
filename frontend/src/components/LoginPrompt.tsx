import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3, FileText, Shield, Zap } from 'lucide-react';

export default function LoginPrompt() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-primary/10 border-2 border-primary/20 mb-4">
            <Zap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-display tracking-tighter">
            modLogic
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional trading model analytics for ICT methodology practitioners. Build models, track trades, and analyze performance.
          </p>
          <div className="pt-4">
            <Button
              size="lg"
              onClick={login}
              disabled={isLoggingIn}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-display"
            >
              {isLoggingIn ? 'Connecting...' : 'Get Started'}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="w-12 h-12 rounded bg-chart-1/10 border border-chart-1/20 flex items-center justify-center mb-2">
                <FileText className="w-6 h-6 text-chart-1" />
              </div>
              <CardTitle className="font-display">Model Builder</CardTitle>
              <CardDescription>
                Create detailed trading models with ICT tools across narrative, framework, and execution zones
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="w-12 h-12 rounded bg-chart-2/10 border border-chart-2/20 flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-chart-2" />
              </div>
              <CardTitle className="font-display">Trade Journal</CardTitle>
              <CardDescription>
                Log trades with bracket orders, track adherence, and document your execution with screenshots
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <div className="w-12 h-12 rounded bg-chart-3/10 border border-chart-3/20 flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-chart-3" />
              </div>
              <CardTitle className="font-display">Analytics</CardTitle>
              <CardDescription>
                Comprehensive performance metrics, equity curves, session analysis, and Monte Carlo simulations
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg mb-1">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your trading data is stored securely on the Internet Computer blockchain. Login with Internet Identity for privacy-first authentication.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

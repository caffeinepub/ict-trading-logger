import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, TrendingUp, FileText, BarChart3, Moon, Sun, LogOut, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';

interface HeaderProps {
  currentPage: 'dashboard' | 'models' | 'trades' | 'analytics';
  onNavigate: (page: 'dashboard' | 'models' | 'trades' | 'analytics') => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { identity, clear, loginStatus } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const isAuthenticated = !!identity;

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-xl text-foreground tracking-tighter">
              modLogic
            </span>
          </div>

          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              <Button
                variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('dashboard')}
                className="gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant={currentPage === 'models' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('models')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Models
              </Button>
              <Button
                variant={currentPage === 'trades' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('trades')}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Trades
              </Button>
              <Button
                variant={currentPage === 'analytics' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onNavigate('analytics')}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isAuthenticated && userProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 border border-primary/20 text-primary font-display">
                      {getInitials(userProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">Trader</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <div className="md:hidden border-t border-border/40">
          <nav className="container flex items-center justify-around px-2 py-2">
            <Button
              variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('dashboard')}
              className="flex-col h-auto py-2 gap-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">Dashboard</span>
            </Button>
            <Button
              variant={currentPage === 'models' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('models')}
              className="flex-col h-auto py-2 gap-1"
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs">Models</span>
            </Button>
            <Button
              variant={currentPage === 'trades' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('trades')}
              className="flex-col h-auto py-2 gap-1"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Trades</span>
            </Button>
            <Button
              variant={currentPage === 'analytics' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('analytics')}
              className="flex-col h-auto py-2 gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Analytics</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

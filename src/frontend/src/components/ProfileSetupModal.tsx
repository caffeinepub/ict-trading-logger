import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User } from 'lucide-react';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      // Backend automatically registers the user if not already registered
      // This profile save operation will trigger ensureUserRegistered on the backend
      await saveProfile.mutateAsync({ name: name.trim() });
      toast.success('Profile created successfully!');
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error?.message?.includes('Actor not available')) {
        errorMessage = 'Connection error. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error('Profile Setup Failed', {
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Welcome!</DialogTitle>
              <DialogDescription>Let's set up your profile</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name *</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={saveProfile.isPending}
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed throughout the application
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={saveProfile.isPending || !name.trim()}
          >
            {saveProfile.isPending ? 'Creating Profile...' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  redirectTo?: string;
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login', redirectTo }: AuthModalProps) {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', loginData);
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      onClose();
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', signupData);
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      onClose();
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">Sign in or create an account</DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-400">
              Unlock study history and personalization
            </DialogDescription>
          </DialogHeader>

{error && (
            <div
              className="mb-3 p-2 rounded text-xs font-medium border bg-red-500/20 border-red-500/70 text-red-300"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {/* Social */}
          <div className="space-y-2 mt-2">
            <Button
              onClick={() => console.log('Google login')}
              variant="outline"
              className="w-full h-9 bg-white text-black hover:bg-gray-100 hover:text-black border-0 text-sm"
              aria-label="Continue with Google"
            >
              Continue with Google
            </Button>
            <Button
              onClick={() => console.log('Apple login')}
              variant="outline"
              className="w-full h-9 bg-white text-black hover:bg-gray-100 hover:text-black border-0 text-sm"
              aria-label="Continue with Apple"
            >
              Continue with Apple
            </Button>
          </div>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-2 bg-black text-gray-500">or</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger className="text-xs" value="login">Sign in</TabsTrigger>
              <TabsTrigger className="text-xs" value="signup">Sign up</TabsTrigger>
            </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3 mt-3">
              <div>
                <Label className="text-xs" htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label className="text-xs" htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-9 text-sm" disabled={isLoading}>
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3 mt-3">
              <div>
                <Label className="text-xs" htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label className="text-xs" htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label className="text-xs" htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <Button type="submit" className="w-full h-9 text-sm" disabled={isLoading}>
                {isLoading ? 'Creating account…' : 'Sign up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

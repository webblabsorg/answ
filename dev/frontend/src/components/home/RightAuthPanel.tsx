'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XIcon, GraduationCapIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface RightAuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RightAuthPanel({ isOpen, onClose }: RightAuthPanelProps) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [mode, setMode] = useState<'email' | 'login' | 'signup' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMode('signup');
  };

  const handleGoogleLogin = () => {
    // Implement Google OAuth
    console.log('Google login');
  };

  const handleAppleLogin = () => {
    // Implement Apple OAuth
    console.log('Apple login');
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { signInWithMicrosoft } = await import('@/lib/auth/microsoft');
      const ms = await signInWithMicrosoft();
      if (ms?.idToken) {
        // Exchange with backend (ensure endpoint exists)
        const resp = await apiClient.post('/auth/microsoft', { id_token: ms.idToken });
        const { user, access_token } = resp.data;
        setAuth(user, access_token);
        onClose();
      } else {
        setError('Microsoft sign-in not available.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Microsoft sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('/auth/phone/start', { phone });
      setOtpSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const resp = await apiClient.post('/auth/phone/verify', { phone, code: otp });
      const { user, access_token } = resp.data;
      setAuth(user, access_token);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { user, access_token } = response.data;
      setAuth(user, access_token);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close sign in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-black text-white z-50 shadow-2xl border-l border-gray-800 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCapIcon className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-bold">answly</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
              aria-label="Close sign in panel"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Sign in or create an account</h2>
              <p className="text-gray-400 text-sm">
                Unlock AI-powered study help and save your practice history
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded-lg text-sm">
                {error}
              </div>
            )}

            {mode === 'email' && (
              <div className="space-y-4">
                {/* Social Login */}
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full h-12 bg-white text-black hover:bg-gray-100 hover:text-black border-0"
                  aria-label="Continue with Google"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  onClick={handleAppleLogin}
                  variant="outline"
                  className="w-full h-12 bg-white text-black hover:bg-gray-100 hover:text-black border-0"
                  aria-label="Continue with Apple"
                >
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>


                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black text-gray-400">or</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-white text-black hover:bg-gray-100"
                    disabled={isLoading}
                  >
                    Continue with email
                  </Button>
                </form>

                <p className="text-xs text-gray-500 text-center">
                  By signing up, you agree to our{' '}
                  <a href="/terms" className="underline hover:text-gray-400">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="underline hover:text-gray-400">Privacy Policy</a>
                </p>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-gray-400">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-black hover:bg-gray-100"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Don't have an account? Sign up
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label className="text-gray-400">Full Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-black hover:bg-gray-100"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Already have an account? Login
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

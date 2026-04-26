'use client';

import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { AlertsBell } from '@/components/AlertsBell';
import Link from 'next/link';

export function NavbarAuthButtons() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="h-7 w-7 rounded-full bg-stone-800 animate-pulse" />;
  }

  if (isSignedIn) {
    return (
      <>
        <Link href="/watchlist" className="text-xs text-stone-400 hover:text-stone-200 transition-colors hidden sm:block">Watchlist</Link>
        <Link href="/portfolio" className="text-xs text-stone-400 hover:text-stone-200 transition-colors hidden sm:block">Portfolio</Link>
        <Link href="/rebalance" className="text-xs text-stone-400 hover:text-stone-200 transition-colors hidden sm:block">Rebalance</Link>
        <Link href="/settings" className="text-xs text-stone-400 hover:text-stone-200 transition-colors hidden sm:block">Settings</Link>
        <AlertsBell />
        <UserButton appearance={{ elements: { avatarBox: 'h-7 w-7' } }} />
      </>
    );
  }

  return (
    <SignInButton mode="redirect">
      <button className="text-xs text-stone-400 hover:text-stone-200 border border-stone-700 rounded-lg px-3 py-1.5">
        Sign in
      </button>
    </SignInButton>
  );
}

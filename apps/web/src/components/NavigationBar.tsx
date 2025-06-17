"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, PlayCircle, BookOpen, LogOut } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavigationBar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();

  const isActive = (path: string) => pathname === path;

  const handleLogin = () => {
    login(pathname);
  };

  const handleLogout = async () => {
    await logout();
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex items-center h-16 w-full px-4 sm:px-8 lg:px-16 bg-white border-b border-[var(--border-primary)]">
      <div className="flex items-center justify-between w-full">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/frame.svg"
            alt="Infillo Logo"
            width={34}
            height={32}
            className="w-[34px] h-8"
          />
          <div className="font-text-2xl-normal text-black">Infillo</div>
        </Link>

        {/* Navigation Links - Centered */}
        <nav className="hidden lg:flex items-center justify-center gap-1 flex-1 h-8">
          <Link
            href="/"
            className={`flex items-center justify-center gap-1.5 h-8 rounded-lg font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] cursor-pointer transition-all ${
              isActive("/") 
                ? "bg-[var(--bg-tertiary)] text-[var(--text-dark)] pl-2 pr-3" 
                : "text-[var(--text-primary)] px-3"
            }`}
          >
            <Home className={`w-5 h-5 ${isActive("/") ? "text-[var(--text-dark)]" : "text-[var(--text-primary)]"}`} strokeWidth={1.5} />
            Home
          </Link>
          
          <Link
            href="/demo-forms"
            className={`flex items-center justify-center gap-1.5 h-8 rounded-lg font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] cursor-pointer transition-all ${
              isActive("/demo-forms") 
                ? "bg-[var(--bg-tertiary)] text-[var(--text-dark)] pl-2 pr-3" 
                : "text-[var(--text-primary)] px-3"
            }`}
          >
            <PlayCircle className={`w-5 h-5 ${isActive("/demo-forms") ? "text-[var(--text-dark)]" : "text-[var(--text-primary)]"}`} strokeWidth={1.5} />
            Demo Forms
          </Link>

          {/* Only show authenticated-only links to signed-in users */}
          {isAuthenticated && (
            <>
              <Link
                href="/information-records"
                className={`flex items-center justify-center gap-1.5 h-8 rounded-lg font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] cursor-pointer transition-all ${
                  isActive("/information-records") 
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-dark)] pl-2 pr-3" 
                    : "text-[var(--text-primary)] px-3"
                }`}
              >
                <BookOpen className={`w-5 h-5 ${isActive("/information-records") ? "text-[var(--text-dark)]" : "text-[var(--text-primary)]"}`} strokeWidth={1.5} />
                Information Records
              </Link>
            </>
          )}
          
          {/* Show Go Pro link to all users */}
          <Link
            href="/go-pro"
            className={`flex items-center justify-center h-8 px-3 rounded-lg font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] cursor-pointer transition-all ${
              isActive("/go-pro") 
                ? "bg-[var(--bg-tertiary)] text-[var(--text-dark)]" 
                : "text-[var(--text-primary)]"
            }`}
          >
            Go Pro
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-sm">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/information-records" className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Information Records</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={handleLogin}
              className="h-8 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-text-sm-medium"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 
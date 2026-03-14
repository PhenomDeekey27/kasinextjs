"use client";

import Link from "next/link";
import { Train } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4 max-w-7xl">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center space-x-2">
            <Train className="h-6 w-6 text-blue-600" />
            <span className="hidden font-bold sm:inline-block text-lg">
              J Tourism
            </span>
          </Link>
        </div>
        
        {/* Mobile Logo */}
        <div className="flex flex-1 md:hidden">
            <Link href="/" className="flex items-center space-x-2">
              <Train className="h-6 w-6 text-blue-600" />
              <span className="font-bold">J Tourism</span>
            </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary px-3 py-2 hidden sm:block">
              Home
            </Link>
            <Link href="/book-ticket">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4">
                Book Ticket
              </Button>
            </Link>
            <Link href="/admin/login" className="text-sm font-medium transition-colors hover:text-primary px-3 py-2 hidden sm:block">
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}

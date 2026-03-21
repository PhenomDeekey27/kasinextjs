"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function Navbar() {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900 text-white shadow-md">
      <div className="container flex h-16 items-center mx-auto px-4 max-w-7xl">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.jpeg"
              alt="J Tourism logo"
              width={56}
              height={56}
              className="h-14 w-14 rounded-md object-cover bg-white p-1"
            />
            <span className="hidden font-bold sm:inline-block text-lg text-white">
              J Tourism
            </span>
          </Link>
        </div>
        
        {/* Mobile Logo */}
        <div className="flex flex-1 md:hidden">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.jpeg"
                alt="J Tourism logo"
                width={52}
                height={52}
                className="h-12 w-12 rounded-md object-cover bg-white p-1"
              />
              <span className="font-bold text-white">J Tourism</span>
            </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-blue-300 px-3 py-2 hidden sm:block text-white">
              Home
            </Link>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4"
              onClick={() => {
                router.push(`/book-ticket?reset=${Date.now()}`);
              }}
            >
              Book Ticket
            </Button>
            <Link href="/admin/login" className="text-sm font-medium transition-colors hover:text-blue-300 px-3 py-2 hidden sm:block text-white">
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </nav>
  );
}

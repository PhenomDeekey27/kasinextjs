import Image from "next/image";
import Link from "next/link";
import { SUPPORT_CONTACT_NUMBER } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-900">
      <div className="container mx-auto px-4 max-w-7xl relative z-10 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image
                src="/logo.jpeg"
                alt="J Tourism logo"
                width={52}
                height={52}
                className="h-12 w-12 rounded-md object-cover bg-white p-1"
              />
              <span className="font-bold text-xl text-white">J Tourism</span>
            </Link>
            <p className="text-sm text-slate-300 max-w-xs mt-4">
              Group friendly seat booking with automatic allocation for tourism train travel.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white">Links</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link href="/" className="hover:text-blue-300 transition-colors">Home</Link></li>
              <li><Link href="/book-ticket" className="hover:text-blue-300 transition-colors">Book Ticket</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white">Admin</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><Link href="/admin/login" className="hover:text-blue-300 transition-colors">Login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white">Contact</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                <a href={`tel:${SUPPORT_CONTACT_NUMBER}`} className="hover:text-blue-300 transition-colors">
                  {SUPPORT_CONTACT_NUMBER}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-300">
          <p>© {new Date().getFullYear()} J Tourism Humming Birds. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

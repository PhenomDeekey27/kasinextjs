import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t bg-slate-50">
      <div className="container mx-auto px-4 max-w-7xl relative z-10 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image
                src="/logo.jpeg"
                alt="J Tourism logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-sm object-cover"
              />
              <span className="font-bold text-lg">J Tourism</span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs mt-4">
              Group friendly seat booking with automatic allocation for tourism train travel.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-900">Links</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
              <li><Link href="/book-ticket" className="hover:text-blue-600 transition-colors">Book Ticket</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-900">Admin</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/admin/login" className="hover:text-blue-600 transition-colors">Login</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
          <p>© {new Date().getFullYear()} J Tourism Humming Birds. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

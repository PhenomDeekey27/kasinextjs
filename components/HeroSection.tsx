"use client";

import { motion } from "framer-motion";
import { Train, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const features = [
  {
    icon: Train,
    title: "Easy Booking",
    description: "Book entire tourist coaches intuitively with our responsive maps.",
  },
  {
    icon: Users,
    title: "Group Seating",
    description: "Automatic seat grouping for up to 8 members per request.",
  },
];

export function HeroSection() {
  return (
    <div className="w-full">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-sky-600 to-indigo-700 py-24 sm:py-32 lg:pb-36 xl:pb-40">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1510133744874-096894065f49?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-15"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.26),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-slate-50" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Book Your Tourism Train Seats Easily
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 text-lg leading-8 text-slate-300"
            >
              Group friendly seat booking with automatic allocation. Avoid the hassle
              of uncoordinated tourism travel with seamless reservations.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              <Link href="/book-ticket">
                <Button size="lg" className="rounded-full bg-white px-8 py-6 text-lg font-semibold text-sky-700 shadow-lg hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all hover:scale-105">
                  Book Tickets
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Faster travel</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need for tourism travel
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-3xl mx-auto grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col"
                >
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                    <feature.icon className="h-5 w-5 flex-none text-blue-600" aria-hidden="true" />
                    {feature.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}

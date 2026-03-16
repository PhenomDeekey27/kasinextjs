import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SUPPORT_CONTACT_NUMBER } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAadhaar(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function getDuplicateAadhaarMessage(aadhaarNumber: string) {
  return `A record with Aadhaar number ${aadhaarNumber} already exists. Duplicate registration is not allowed. For any queries contact ${SUPPORT_CONTACT_NUMBER}.`;
}

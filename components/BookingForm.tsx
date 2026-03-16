"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  BERTH_TYPES,
  SUPPORT_CONTACT_NUMBER,
  TRAIN_CONFIG,
} from "@/lib/constants";
import { getDuplicateAadhaarMessage, normalizeAadhaar } from "@/lib/utils";
import { Info, FileText, X } from "lucide-react";
import { BookingSuccess } from "./BookingSuccess";
import { submitBooking, fetchReferenceMembers } from "@/lib/api";

const passengerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(50),
  age: z.coerce.number().min(1, "Invalid age").max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  seatPreference: z.enum(["LB", "MB", "UB", "SL", "SU", "No Preference"]),
});

const aadhaarFieldSchema = z
  .string()
  .refine(
    (value) => normalizeAadhaar(value).length === 12,
    "Aadhaar must be 12 digits",
  );

const formSchema = z
  .object({
    primaryPassenger: passengerSchema.extend({
      phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
      aadhaar: aadhaarFieldSchema,
      referenceMember: z.string().optional(),
    }),
    groupMembers: z
      .array(
        passengerSchema.extend({
          aadhaar: aadhaarFieldSchema,
        }),
      )
      .max(
        TRAIN_CONFIG.MAX_GROUP_SIZE - 1,
        `Max group size is ${TRAIN_CONFIG.MAX_GROUP_SIZE}`,
      ),
    paymentMode: z.enum(["online", "manual"]),
    paymentAmount: z.coerce.number().min(1, "Amount is required"),
    paymentProof: z.any().optional(), // Payment proof for online bookings
  })
  .superRefine((values, ctx) => {
    const seenAadhaars = new Set<string>();
    const primaryAadhaar = normalizeAadhaar(values.primaryPassenger.aadhaar);

    seenAadhaars.add(primaryAadhaar);

    values.groupMembers.forEach((member, index) => {
      const memberAadhaar = normalizeAadhaar(member.aadhaar);

      if (seenAadhaars.has(memberAadhaar)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["groupMembers", index, "aadhaar"],
          message: "This Aadhaar number is already used in this booking.",
        });
        return;
      }

      seenAadhaars.add(memberAadhaar);
    });
  });

export type BookingFormValues = z.infer<typeof formSchema>;

export function BookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceMembers, setReferenceMembers] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isReferenceLocked, setIsReferenceLocked] = useState(false);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(
    null,
  );
  const [paymentUploadKey, setPaymentUploadKey] = useState(0);
  const { toast } = useToast();

  // Load reference members on component mount
  useEffect(() => {
    const loadReferenceMembers = async () => {
      try {
        const members = await fetchReferenceMembers();
        setReferenceMembers(members);
      } catch (error) {
        console.error("Failed to load reference members:", error);
        // Fallback to empty list on error
        setReferenceMembers([]);
        toast({
          title: "Warning",
          description: "Could not load reference members list",
          variant: "destructive",
        });
      } finally {
        setLoadingMembers(false);
      }
    };
    loadReferenceMembers();
  }, [toast]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema) as Resolver<BookingFormValues>,
    defaultValues: {
      primaryPassenger: {
        name: "",
        age: 0,
        gender: "Male",
        seatPreference: "No Preference",
        phone: "",
        aadhaar: "",
        referenceMember: "", // default
      },
      groupMembers: [],
      paymentMode: "online",
      paymentAmount: 0,
    },
  });

  const {
    fields: memberFields,
    append: appendMember,
    remove: removeMember,
  } = useFieldArray({
    control: form.control,
    name: "groupMembers",
  });

  const paymentMode = form.watch("paymentMode");
  const totalPassengers = 1 + memberFields.length;

  const referenceQuery = (
    form.watch("primaryPassenger.referenceMember") || ""
  ).trim();
  const hasExactReferenceMatch = referenceMembers.some(
    (member) => member.name.toLowerCase() === referenceQuery.toLowerCase(),
  );
  const filteredReferenceMembers = referenceMembers
    .filter((member) =>
      member.name.toLowerCase().includes(referenceQuery.toLowerCase()),
    )
    .slice(0, 12);

  const resetBookingForm = () => {
    form.reset({
      primaryPassenger: {
        name: "",
        age: 0,
        gender: "Male",
        seatPreference: "No Preference",
        phone: "",
        aadhaar: "",
        referenceMember: "",
      },
      groupMembers: [],
      paymentMode: "online",
      paymentAmount: 0,
      paymentProof: undefined,
    });
    setPaymentProofPreview(null);
    setPaymentUploadKey((prev) => prev + 1);
    setIsReferenceLocked(false);
  };

  const onSubmit = async (data: BookingFormValues) => {
    // Validation: Payment proof required for online payments
    if (
      data.paymentMode === "online" &&
      (!data.paymentProof || (data.paymentProof as FileList).length === 0)
    ) {
      toast({
        title: "Payment Proof Required",
        description:
          "Please upload the payment screenshot for online bookings.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await submitBooking(data);
      setIsSuccess(true);
      toast({
        title: "Booking Submitted Successfully! ✓",
        description:
          "Your seat request has been placed. You will receive a confirmation call shortly.",
        variant: "default",
      });
      console.log("Booking response:", response);
    } catch (error: unknown) {
      let errorMessage =
        "There was an error submitting your request. Please try again.";

      if (axios.isAxiosError(error)) {
        if (error.response?.data && typeof error.response.data === "object") {
          const responseData = error.response.data as { error?: string };
          if (responseData.error) {
            errorMessage = responseData.error;
          }
        }

        if (!errorMessage && error.message) {
          errorMessage = error.message;
        }

        if (error.response?.status === 409) {
          errorMessage =
            (error.response?.data as { error?: string } | undefined)?.error ||
            getDuplicateAadhaarMessage(
              normalizeAadhaar(data.primaryPassenger.aadhaar),
            );
        } else {
          console.error("Booking submission error:", error);
        }
      } else {
        console.error("Booking submission error:", error);
        if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Booking Failed ✗",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <BookingSuccess
        onReset={() => {
          resetBookingForm();
          setIsSuccess(false);
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 rounded-xl overflow-hidden">
      <div className="bg-blue-600 px-6 py-8 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Image
            src="/logo.jpeg"
            alt="J Tourism logo"
            width={36}
            height={36}
            className="w-9 h-9 rounded-md object-cover border border-white/30"
          />
          <h2 className="text-2xl font-bold">Book Train Seats</h2>
        </div>
        <p className="text-blue-100 opacity-90">
          Complete the form below to request seats for your tourism travel.
        </p>
      </div>

      <CardContent className="p-6 sm:p-8 bg-slate-50">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            {/* 1. Primary Passenger Details */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 border-b pb-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Primary Passenger Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="primaryPassenger.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryPassenger.age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryPassenger.gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="primaryPassenger.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryPassenger.aadhaar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 5678 9012"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryPassenger.seatPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Preference</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="No Preference">
                            No Preference
                          </SelectItem>
                          {Object.entries(BERTH_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value} ({key})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryPassenger.referenceMember"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Member (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            placeholder={
                              loadingMembers
                                ? "Loading reference members..."
                                : "Type to search reference members"
                            }
                            value={field.value || ""}
                            onChange={(e) => {
                              setIsReferenceLocked(false);
                              field.onChange(e.target.value);
                            }}
                            disabled={loadingMembers || isReferenceLocked}
                          />

                          {isReferenceLocked && (
                            <div className="flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
                              <span className="text-slate-600">
                                Selected reference member
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsReferenceLocked(false)}
                              >
                                Change
                              </Button>
                            </div>
                          )}

                          {!loadingMembers &&
                            !isReferenceLocked &&
                            referenceQuery.length > 0 && (
                              <div className="max-h-40 overflow-y-auto rounded-md border bg-white p-1">
                                {filteredReferenceMembers.length > 0 ? (
                                  filteredReferenceMembers.map((member) => (
                                    <button
                                      key={member.id}
                                      type="button"
                                      className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100"
                                      onClick={() => {
                                        field.onChange(member.name);
                                        setIsReferenceLocked(true);
                                      }}
                                    >
                                      {member.name}
                                    </button>
                                  ))
                                ) : (
                                  <p className="px-3 py-2 text-sm text-slate-500">
                                    {hasExactReferenceMatch
                                      ? "Reference selected"
                                      : "No matches found. New name will be added on submit."}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 2. Group Members */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </span>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Group Members
                  </h3>
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  Total: {totalPassengers} / {TRAIN_CONFIG.MAX_GROUP_SIZE}
                </div>
              </div>

              {memberFields.length === 0 && (
                <div className="text-center py-6 bg-white border border-dashed rounded-lg">
                  <p className="text-slate-500 mb-4">
                    Are you traveling with family or friends?
                  </p>
                </div>
              )}

              {memberFields.map((field, index) => (
                <div
                  key={field.id}
                  className="relative p-6 bg-white border rounded-xl shadow-sm mb-4"
                >
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-sm font-semibold transition"
                  >
                    Remove
                  </button>
                  <h4 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wider">
                    Member {index + 1}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`groupMembers.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel className="text-xs">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`groupMembers.${index}.aadhaar`}
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel className="text-xs">
                            Aadhaar Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1234 5678 9012"
                              inputMode="numeric"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`groupMembers.${index}.age`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Age" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`groupMembers.${index}.gender`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`groupMembers.${index}.seatPreference`}
                      render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                          <FormLabel className="text-xs">Preference</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Preference" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="No Preference">No</SelectItem>
                              {Object.entries(BERTH_TYPES).map(([key]) => (
                                <SelectItem key={key} value={key}>
                                  {key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                onClick={() => {
                  if (totalPassengers < TRAIN_CONFIG.MAX_GROUP_SIZE) {
                    appendMember({
                      name: "",
                      age: 0,
                      gender: "Male",
                      aadhaar: "",
                      seatPreference: "No Preference",
                    });
                  } else {
                    toast({
                      title: "Group Full",
                      description: `Available seats are less than the requested group size. Please contact our coordinator at ${SUPPORT_CONTACT_NUMBER}`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                + Add Member
              </Button>
            </div>

            {/* 3. Payment Details */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 border-b pb-2">
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Payment
                </h3>
              </div>

              {/* Payment Details */}
              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Booking Type</FormLabel>
                      <FormControl>
                        <Tabs
                          value={field.value}
                          onValueChange={field.onChange}
                          className="w-full max-w-md"
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="online">
                              Online Payment
                            </TabsTrigger>
                            <TabsTrigger value="manual">
                              Manual Booking
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Paying Today (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 5000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {paymentMode === "online" && (
                    <FormField
                      control={form.control}
                      name="paymentProof"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Screenshot Proof</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <FileText className="w-8 h-8 mb-3 text-slate-400" />
                                  <p className="mb-2 text-sm text-slate-500">
                                    <span className="font-semibold">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    PNG, JPG up to 5MB
                                  </p>
                                </div>
                                <Input
                                  key={paymentUploadKey}
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    field.onChange(e.target.files);
                                    if (e.target.files && e.target.files[0]) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setPaymentProofPreview(
                                          reader.result as string,
                                        );
                                      };
                                      reader.readAsDataURL(e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>

                              {paymentProofPreview && (
                                <div className="flex items-start gap-3 rounded-lg border bg-white p-3">
                                  <img
                                    src={paymentProofPreview}
                                    alt="Payment proof preview"
                                    className="h-20 w-20 rounded-md border object-cover"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">
                                      Uploaded image preview
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      If this is wrong, remove it and upload
                                      again.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setPaymentProofPreview(null);
                                      form.setValue("paymentProof", undefined);
                                      setPaymentUploadKey((prev) => prev + 1);
                                    }}
                                    aria-label="Remove uploaded payment screenshot"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {paymentMode === "manual" && (
                  <div className="bg-amber-50 rounded-lg p-4 flex items-start space-x-3 text-amber-800">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      You selected manual booking. Your seats will be held
                      temporarily. Our coordinators will contact you soon for
                      offline payment processing.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:scale-[1.01]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Submit Booking Request"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

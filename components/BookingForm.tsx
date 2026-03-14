"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { BERTH_TYPES, TRAIN_CONFIG } from "@/lib/constants";
import { Train, Info, FileText } from "lucide-react";
import { BookingSuccess } from "./BookingSuccess";
import { submitBooking } from "@/lib/api";

const passengerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(50),
  age: z.coerce.number().min(1, "Invalid age").max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  seatPreference: z.enum(["LB", "MB", "UB", "SL", "SU", "No Preference"]),
});

const formSchema = z.object({
  primaryPassenger: passengerSchema.extend({
    phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
    aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
    referenceMember: z.string().min(1, "Select reference member").optional(),
  }),
  groupMembers: z.array(passengerSchema).max(TRAIN_CONFIG.MAX_GROUP_SIZE - 1, `Max group size is ${TRAIN_CONFIG.MAX_GROUP_SIZE}`),
  paymentMode: z.enum(["online", "manual"]),
  paymentAmount: z.coerce.number().min(1, "Amount is required"),
  paymentProof: z.any().optional(), // In real app, validate File object
});

export type BookingFormValues = z.infer<typeof formSchema>;

const REFERENCE_MEMBERS = ["John Doe", "Jane Smith", "Alex Kumar", "None"];

export function BookingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      primaryPassenger: {
        name: "",
        age: 0,
        gender: "Male",
        seatPreference: "No Preference",
        phone: "",
        aadhaar: "",
        referenceMember: "None", // default
      },
      groupMembers: [],
      paymentMode: "online",
      paymentAmount: 0,
    },
  });

  const { fields: memberFields, append: appendMember, remove: removeMember } = useFieldArray({
    control: form.control,
    name: "groupMembers",
  });

  const paymentMode = form.watch("paymentMode");
  const totalPassengers = 1 + memberFields.length;

  const onSubmit = async (data: BookingFormValues) => {
    // Validate custom rule: File upload required if online payment
    if (data.paymentMode === "online" && !data.paymentProof) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload the payment screenshot for online bookings.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitBooking(data);
      setIsSuccess(true);
      toast({
        title: "Booking Submitted",
        description: "Your seat request has been placed successfully.",
      });
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return <BookingSuccess onReset={() => { form.reset(); setIsSuccess(false); }} />;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0 rounded-xl overflow-hidden">
      <div className="bg-blue-600 px-6 py-8 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Train className="w-8 h-8" />
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
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                <h3 className="text-lg font-semibold text-slate-800">Primary Passenger Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="primaryPassenger.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
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
                        <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger></FormControl>
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
                      <FormControl><Input placeholder="9876543210" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="1234 5678 9012" {...field} /></FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Preference" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="No Preference">No Preference</SelectItem>
                          {Object.entries(BERTH_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value} ({key})</SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Coordinator" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {REFERENCE_MEMBERS.map(member => (
                            <SelectItem key={member} value={member}>{member}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                  <h3 className="text-lg font-semibold text-slate-800">Group Members</h3>
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  Total: {totalPassengers} / {TRAIN_CONFIG.MAX_GROUP_SIZE}
                </div>
              </div>

              {memberFields.length === 0 && (
                <div className="text-center py-6 bg-white border border-dashed rounded-lg">
                  <p className="text-slate-500 mb-4">Are you traveling with family or friends?</p>
                </div>
              )}

              {memberFields.map((field, index) => (
                <div key={field.id} className="relative p-6 bg-white border rounded-xl shadow-sm mb-4">
                  <button 
                    type="button" 
                    onClick={() => removeMember(index)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 text-sm font-semibold transition"
                  >
                    Remove
                  </button>
                  <h4 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wider">Member {index + 1}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <FormField
                        control={form.control}
                        name={`groupMembers.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-xs">Name</FormLabel>
                            <FormControl><Input placeholder="Name" {...field} /></FormControl>
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
                            <FormControl><Input type="number" placeholder="Age" {...field} /></FormControl>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger></FormControl>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Preference" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="No Preference">No</SelectItem>
                                {Object.entries(BERTH_TYPES).map(([key]) => (
                                  <SelectItem key={key} value={key}>{key}</SelectItem>
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
                    appendMember({ name: "", age: 0, gender: "Male", seatPreference: "No Preference" });
                  } else {
                    toast({
                      title: "Group Full",
                      description: `Available seats are less than the requested group size. Please contact our coordinator at +91 9000000000`,
                      variant: "destructive"
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
                <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">3</span>
                <h3 className="text-lg font-semibold text-slate-800">Payment Form</h3>
              </div>

              <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <FormField
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Booking Type</FormLabel>
                      <FormControl>
                         <Tabs defaultValue={field.value} onValueChange={field.onChange} className="w-full max-w-md">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="online">Online Payment</TabsTrigger>
                            <TabsTrigger value="manual">Manual Booking</TabsTrigger>
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
                          <Input type="number" placeholder="e.g. 5000" {...field} />
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
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <FileText className="w-8 h-8 mb-3 text-slate-400" />
                                  <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                  <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                                </div>
                                <Input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => field.onChange(e.target.files)} 
                                />
                              </label>
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
                    <p className="text-sm">You selected manual booking. Your seats will be held temporarily. Our coordinators will contact you soon for offline payment processing.</p>
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

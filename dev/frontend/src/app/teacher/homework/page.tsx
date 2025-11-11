"use client";
import { TeacherDashboard } from "@/components/homework/TeacherDashboard";

export default function Page() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teacher Homework</h1>
      <TeacherDashboard />
    </div>
  );
}

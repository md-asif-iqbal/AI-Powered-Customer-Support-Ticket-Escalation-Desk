import { z } from "zod";

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters")
    .trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  role: z.enum(["CUSTOMER", "AGENT", "ADMIN"]).default("CUSTOMER"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const CreateTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title cannot exceed 150 characters")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(4000, "Description cannot exceed 4000 characters")
    .trim(),
  category: z.enum(["TECHNICAL", "BILLING", "ACCOUNT", "GENERAL"]).default("GENERAL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const UpdateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"]),
  assignedTo: z.string().optional().nullable(),
  note: z.string().optional(),
});

export const EscalateTicketSchema = z.object({
  reason: z
    .string()
    .min(5, "Escalation reason must be at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters")
    .trim(),
  notes: z.string().optional(),
});

export const CreateCommentSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(3000, "Message cannot exceed 3000 characters")
    .trim(),
  isInternalNote: z.boolean().default(false),
  isAiGenerated: z.boolean().default(false),
});

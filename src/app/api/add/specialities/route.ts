// File: app/api/add/specialities/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 1) Define a Zod schema for the incoming payload
const specialitySchema = z.object({
  name: z.string().min(1, "Numele specialității este obligatoriu"),
  description: z.string().optional(),
  price: z.number().nonnegative("Prețul nu poate fi negativ").optional(),
});
type SpecialityData = z.infer<typeof specialitySchema>;

export async function POST(req: Request) {
  try {
    // 2) Parse & validate
    const body = await req.json();
    const parsed = specialitySchema.safeParse(body);
    if (!parsed.success) {
      const errors: Record<string,string> = {};
      parsed.error.issues.forEach(issue => {
        errors[issue.path[0] as string] = issue.message;
      });
      return NextResponse.json({ errors }, { status: 400 });
    }
    const { name, description, price } = parsed.data;

    // 3) Create in the database
    const created = await prisma.speciality.create({
      data: {
        name,
        description: description ?? "",
        price: price ?? 0,
      },
    });

    // 4) Return the newly created record
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error(err.stack);
    return NextResponse.json(
      { error: "Eroare internă la crearea specialității" },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Expenditure } from "@/lib/models/Expenditure";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month"); // YYYY-MM
  if (!month) {
    return Response.json({ error: "month param required" }, { status: 400 });
  }

  await connectDB();
  const docs = await Expenditure.find({ date: { $regex: `^${month}` } })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  return Response.json(docs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, description, amount } = body;

  if (!date || !description || amount == null) {
    return Response.json({ error: "date, description, amount required" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < 0) {
    return Response.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  await connectDB();
  const doc = await Expenditure.create({ date, description, amount });

  return Response.json(doc, { status: 201 });
}

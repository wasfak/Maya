import { connectDB } from "@/lib/db";
import { Expenditure } from "@/lib/models/Expenditure";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/expenditures/[id]">
) {
  const { id } = await ctx.params;

  await connectDB();
  const deleted = await Expenditure.findByIdAndDelete(id);
  if (!deleted) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/expenditures/[id]">
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { date } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
  }

  await connectDB();
  const updated = await Expenditure.findByIdAndUpdate(id, { date }, { new: true });
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(updated);
}

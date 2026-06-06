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

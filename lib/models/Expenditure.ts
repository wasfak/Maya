import mongoose, { Schema, model, models } from "mongoose";

export interface IExpenditure {
  _id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  createdAt: Date;
}

const ExpenditureSchema = new Schema<IExpenditure>(
  {
    date: { type: String, required: true, index: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Expenditure =
  models.Expenditure ?? model<IExpenditure>("Expenditure", ExpenditureSchema);

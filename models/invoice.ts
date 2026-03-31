import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  user_npub: string;
  payment_request: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    user_npub: { type: String, required: true, index: true },
    payment_request: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'EXPIRED'],
      default: 'PENDING'
    },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);

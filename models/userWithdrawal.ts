import mongoose, { Schema, Document } from 'mongoose';

export interface IUserWithdrawal extends Document {
  user_npub: string;
  payment_request: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  amount: number;
  fees: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserWithdrawalSchema: Schema = new Schema(
  {
    user_npub: { type: String, required: true, index: true },
    payment_request: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING',
    },
    amount: { type: Number, required: true },
    fees: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IUserWithdrawal>('UserWithdrawal', UserWithdrawalSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IUserBalance {
  currency: mongoose.Types.ObjectId;
  amount: number; // Stored in the smallest unit (integer)
}

export interface IUser extends Document {
  pubkey: string;
  balances: IUserBalance[];
  createdAt: Date;
  updatedAt: Date;
}

const UserBalanceSchema = new Schema(
  {
    currency: { type: Schema.Types.ObjectId, ref: 'Cryptocurrency', required: true },
    amount: { type: Number, default: 0, required: true },
  },
  { _id: false }
);

const UserSchema: Schema = new Schema(
  {
    pubkey: { type: String, required: true, unique: true, index: true },
    balances: [UserBalanceSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);

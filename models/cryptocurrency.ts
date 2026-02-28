import mongoose, { Schema, Document } from 'mongoose';

export interface ICryptocurrency extends Document {
  symbol: string;
  name: string;
  image: string;
  decimal_places: number;
}

const CryptocurrencySchema: Schema = new Schema(
  {
    symbol: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    decimal_places: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICryptocurrency>('Cryptocurrency', CryptocurrencySchema);

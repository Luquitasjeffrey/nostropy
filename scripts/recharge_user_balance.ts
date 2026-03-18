import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../utils/db';
import { updateUserBalance } from '../utils/user_balance';
import Cryptocurrency from '../models/cryptocurrency';

const rechargeUserBalance = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npx ts-node recharge_user_balance.ts <user_id_or_pubkey> <token=value> <token=value> ...');
    console.log('Example: npx ts-node recharge_user_balance.ts 69a30464fad2d5cbcd12699d BTC=0.02 USDT=1000');
    process.exit(1);
  }

  const identifier = args[0];
  const rechargeOps = args.slice(1);

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Find user by ID or Pubkey
    let user;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await mongoose.model('User').findById(identifier);
    }
    if (!user) {
      user = await mongoose.model('User').findOne({ pubkey: identifier });
    }

    if (!user) {
      console.log(`👤 User not found. Creating new user with pubkey: ${identifier}`);
      user = await mongoose.model('User').create({ pubkey: identifier, balances: [] });
    }

    console.log(`👤 Recharging balances for user: ${user.pubkey} (${user._id})`);

    for (const op of rechargeOps) {
      const [symbol, valueStr] = op.split('=');
      if (!symbol || !valueStr) {
        console.warn(`⚠️ Skipping invalid argument: ${op}`);
        continue;
      }

      const value = parseFloat(valueStr);
      if (isNaN(value)) {
        console.warn(`⚠️ Skipping invalid value for ${symbol}: ${valueStr}`);
        continue;
      }

      const currency = await Cryptocurrency.findOne({ symbol: symbol.toUpperCase() });
      if (!currency) {
        console.error(`❌ Currency not supported: ${symbol}`);
        continue;
      }

      // Convert to smallest units
      const amountInSmallestUnits = Math.round(value * Math.pow(10, currency.decimal_places));

      await updateUserBalance(user._id as mongoose.Types.ObjectId, currency.symbol, amountInSmallestUnits);
      console.log(`✅ Success: Recharged ${value} ${currency.symbol} (${amountInSmallestUnits} units)`);
    }

    console.log('✨ All operations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during recharge:', error);
    process.exit(1);
  }
};

rechargeUserBalance();

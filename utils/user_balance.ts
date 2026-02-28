import User, { IUser } from '../models/user';
import Cryptocurrency from '../models/cryptocurrency';
import mongoose from 'mongoose';

/**
 * Get or create a user by pubkey.
 * If user is new, we can optionally initialize them with some default balances.
 */
export const getOrCreateUser = async (pubkey: string): Promise<IUser> => {
  let user = await User.findOne({ pubkey });
  if (!user) {
    user = new User({
      pubkey,
      balances: [],
    });
    await user.save();
  }
  return user;
};

/**
 * Update a user's balance for a specific cryptocurrency.
 * amount can be positive (deposit/win) or negative (wager).
 * Returns the updated user.
 */
export const updateUserBalance = async (
  userId: mongoose.Types.ObjectId,
  currencySymbol: string,
  deltaAmount: number
): Promise<IUser> => {
  const currency = await Cryptocurrency.findOne({ symbol: currencySymbol });
  if (!currency) {
    throw new Error(`Currency ${currencySymbol} not found`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Find existing balance for this currency
  const balanceIndex = user.balances.findIndex((b) => b.currency.equals(currency._id));

  if (balanceIndex === -1) {
    // If balance doesn't exist and we are deducting, throw error
    if (deltaAmount < 0) {
      throw new Error('Insufficient balance');
    }
    // Otherwise, create new balance
    user.balances.push({
      currency: currency._id as mongoose.Types.ObjectId,
      amount: deltaAmount,
    });
  } else {
    // Update existing balance
    const newAmount = user.balances[balanceIndex].amount + deltaAmount;
    if (newAmount < 0) {
      throw new Error('Insufficient balance');
    }
    user.balances[balanceIndex].amount = newAmount;
  }

  await user.save();
  return user;
};

/**
 * Get a user's balance for a specific cryptocurrency.
 */
export const getUserBalance = async (
  userId: mongoose.Types.ObjectId,
  currencySymbol: string
): Promise<number> => {
  const currency = await Cryptocurrency.findOne({ symbol: currencySymbol });
  if (!currency) {
    throw new Error(`Currency ${currencySymbol} not found`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const balance = user.balances.find((b) => b.currency.equals(currency._id));
  return balance ? balance.amount : 0;
};

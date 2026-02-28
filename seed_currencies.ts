import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './utils/db';
import Cryptocurrency from './models/cryptocurrency';

const seedCryptocurrencies = async () => {
    try {
        await connectDB();

        const currencies = [
            {
                symbol: 'BTC',
                name: 'Bitcoin',
                image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                decimal_places: 8,
            },
            {
                symbol: 'USDT',
                name: 'Tether',
                image: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
                decimal_places: 6,
            },
        ];

        for (const cur of currencies) {
            await Cryptocurrency.findOneAndUpdate({ symbol: cur.symbol }, cur, {
                upsert: true,
                new: true,
            });
        }

        console.log('Cryptocurrencies seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding cryptocurrencies:', error);
        process.exit(1);
    }
};

seedCryptocurrencies();

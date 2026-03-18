import { Telegraf, Context } from 'telegraf';
import * as dotenv from 'dotenv';
import { spawn } from 'child_process';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminId = process.env.ADMIN_USER_ID;

if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not defined in .env');
    process.exit(1);
}

if (!adminId) {
    console.error('❌ ADMIN_USER_ID is not defined in .env');
    process.exit(1);
}

const bot = new Telegraf(token);

/**
 * Middleware to restrict access to the admin user only.
 */
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (userId !== adminId) {
        console.warn(`🔒 Unauthorized access attempt from user ID: ${userId}`);
        return ctx.reply('⛔ No tienes permisos para usar este bot.');
    }
    return next();
});

/**
 * /deposit <username> <token> <amount>
 * Executes the recharge_user_balance.ts script safely.
 */
bot.command('deposit', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length !== 3) {
        return ctx.reply('❌ Uso: /deposit <username> <token> <amount>\nEjemplo: /deposit user123 BTC 0.05');
    }

    const [username, tokenSymbol, amount] = args;

    // Validate amount is a number
    if (isNaN(parseFloat(amount))) {
        return ctx.reply('❌ Error: El monto debe ser un numero.');
    }

    await ctx.reply(`⏳ Procesando deposito de ${amount} ${tokenSymbol} para ${username}...`);

    const scriptPath = path.resolve(__dirname, '../scripts/recharge_user_balance.ts');
    const rechargeOp = `${tokenSymbol}=${amount}`;

    // Execute the script using npx ts-node
    // spawn is used for safe execution without shell injection vulnerabilities
    const child = spawn('npx', ['ts-node', scriptPath, username, rechargeOp], {
        cwd: path.resolve(__dirname, '..'),
        env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    child.on('close', (code) => {
        if (code === 0) {
            ctx.reply(`✅ Deposito completado exitosamente:\n\`\`\`\n${stdout}\n\`\`\``, { parse_mode: 'Markdown' });
        } else {
            ctx.reply(`❌ Error al procesar el deposito (Code ${code}):\n\`\`\`\n${stderr || stdout}\n\`\`\``, { parse_mode: 'Markdown' });
        }
    });
});

bot.start((ctx) => ctx.reply('👋 Hola Admin! Usa /deposit <username> <token> <amount> para recargar saldos.'));

const launchBot = () => {
    bot.launch()
        .then(() => console.log('🚀 Admin Bot is running...'))
        .catch((err) => {
            console.error('❌ Failed to launch bot:', err)
            setTimeout(() => launchBot(), 5000);
        });
}

launchBot();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

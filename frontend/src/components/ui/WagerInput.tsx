import btcIcon from '../../assets/crypto/btc.svg';
import usdtIcon from '../../assets/crypto/usdt.svg';

// Map symbols to local icons
const CURRENCY_ICONS: Record<string, string> = {
    BTC: btcIcon,
    USDT: usdtIcon,
};

interface WagerInputProps {
    wager: number;
    setWager: (val: number) => void;
    currencySymbol: string;
    setCurrencySymbol: (val: string) => void;
    allBalances: any[];
    prices: Record<string, number>;
    disabled?: boolean;
}

export function WagerInput({
    wager,
    setWager,
    currencySymbol,
    setCurrencySymbol,
    allBalances,
    prices,
    disabled = false,
}: WagerInputProps) {
    const selectedBalance = allBalances.find((b) => b.symbol === currencySymbol);
    const currencyUsdBalance = selectedBalance
        ? (selectedBalance.amount / Math.pow(10, selectedBalance.decimal_places)) *
        (prices[currencySymbol] || 0)
        : 0;

    const currentIcon = CURRENCY_ICONS[currencySymbol];

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-400">Bet Amount</label>
                <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-bold">
                    <span>Balance:</span>
                    <span className="text-white">
                        ${currencyUsdBalance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>
            </div>

            <div className="relative flex items-center bg-[#0f212e] rounded-md border-2 border-[#1a2d37] focus-within:border-gray-500 transition-colors group">
                {/* Dollar prefix */}
                <span className="pl-3 text-gray-400 font-bold text-sm select-none">$</span>

                {/* Number Input */}
                <input
                    type="number"
                    disabled={disabled}
                    className="flex h-11 w-full bg-transparent px-2 py-2 text-sm text-white font-bold placeholder:text-gray-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                    value={wager}
                    onChange={(e) => setWager(Number(e.target.value))}
                />

                {/* Right side controls */}
                <div className="flex items-center pr-1 gap-1 shrink-0">
                    {/* Currency Icon Picker — icon-only trigger, with hidden <select> underneath */}
                    <div className="relative flex items-center">
                        <img
                            src={currentIcon}
                            alt={currencySymbol}
                            className="w-5 h-5 object-contain rounded-full pointer-events-none select-none"
                        />
                        <select
                            disabled={disabled}
                            value={currencySymbol}
                            onChange={(e) => setCurrencySymbol(e.target.value)}
                            title={currencySymbol}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            style={{ fontSize: 0 }}
                        >
                            {allBalances.length > 0
                                ? allBalances.map((b) => (
                                    <option key={b.symbol} value={b.symbol} className="bg-panel text-white text-sm">
                                        {b.symbol} — {b.name}
                                    </option>
                                ))
                                : ['BTC', 'USDT'].map((sym) => (
                                    <option key={sym} value={sym} className="bg-panel text-white text-sm">
                                        {sym}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Divider */}
                    <span className="w-px h-5 bg-[#1a2d37] mx-0.5" />

                    {/* Half / Double */}
                    <button
                        disabled={disabled}
                        onClick={() => setWager(Math.max(0, wager / 2))}
                        className="text-xs font-bold text-gray-400 bg-panel px-2 py-1 rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        ½
                    </button>
                    <button
                        disabled={disabled}
                        onClick={() => setWager(wager * 2)}
                        className="text-xs font-bold text-gray-400 bg-panel px-2 py-1 rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        2x
                    </button>
                </div>
            </div>
        </div>
    );
}

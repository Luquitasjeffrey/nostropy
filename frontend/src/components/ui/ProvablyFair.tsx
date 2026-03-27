import { useState } from 'react';
import { Copy, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';

interface ProvablyFairProps {
  gameId: string | null;
  clientSeed: string | null;
  serverSeedHash: string | null;
  serverSeedShown: string | null;
}

export function ProvablyFair({
  gameId,
  clientSeed,
  serverSeedHash,
  serverSeedShown,
}: ProvablyFairProps) {
  const [isFairnessModalOpen, setIsFairnessModalOpen] = useState(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!gameId) return null;

  return (
    <div className="mt-8 flex flex-col items-center w-full max-w-[500px]">
      <button
        onClick={() => setIsFairnessModalOpen(true)}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors text-xs font-bold mb-4 bg-panel px-4 py-2 rounded-full border-2 border-[#1a2d37] shadow-lg hover:bg-[#2c4757] active:scale-95"
      >
        <ShieldCheck size={14} className="text-primary" />
        <span>Provably Fair</span>
      </button>

      <Modal
        isOpen={isFairnessModalOpen}
        onClose={() => setIsFairnessModalOpen(false)}
        title="Provably Fair Keys"
      >
        <div className="text-sm text-gray-400 flex flex-col space-y-5">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
              Game ID
            </span>
            <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
              <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                {gameId}
              </span>
              <button
                onClick={() => copyText(gameId)}
                className="hover:text-primary transition-colors ml-2"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {clientSeed && (
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                Client Seed
              </span>
              <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
                <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                  {clientSeed}
                </span>
                <button
                  onClick={() => copyText(clientSeed)}
                  className="hover:text-primary transition-colors ml-2"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          {serverSeedHash && (
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                Server Seed Hash
              </span>
              <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-[#1a2d37]">
                <span className="text-gray-300 font-mono text-xs truncate max-w-[240px]">
                  {serverSeedHash}
                </span>
                <button
                  onClick={() => copyText(serverSeedHash)}
                  className="hover:text-primary transition-colors ml-2"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          {serverSeedShown && (
            <div className="flex flex-col space-y-1 border-t border-[#1a2d37] pt-4 mt-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                Server Seed (Revealed)
              </span>
              <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-primary/30">
                <span className="text-gray-300 font-mono text-xs break-all">{serverSeedShown}</span>
                <button
                  onClick={() => copyText(serverSeedShown)}
                  className="hover:text-primary transition-colors ml-2 shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-600 italic text-center pt-2">
            Verify this round's fairness on any independent SHA-256 tool.
          </div>
        </div>
      </Modal>
    </div>
  );
}

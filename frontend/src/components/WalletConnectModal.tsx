
const WalletConnectModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl p-8 w-full max-w-md shadow-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-main text-2xl">&times;</button>
        <h2 className="text-2xl font-bold mb-4 text-main">Connect Wallet</h2>
        <div className="flex flex-col gap-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors">
            <img src="/metamask.svg" alt="MetaMask" className="w-6 h-6" /> MetaMask
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background text-main border border-primary font-semibold hover:bg-primary hover:text-white transition-colors">
            <img src="/walletconnect.svg" alt="WalletConnect" className="w-6 h-6" /> WalletConnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectModal;

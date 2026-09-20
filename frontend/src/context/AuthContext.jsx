import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

const AuthContext = createContext(null);
const HARDHAT_CHAIN_ID = 31337n;

// Past problem: MetaMask was left on Ethereum mainnet -> "insufficient funds".
// Fix: force-switch to Hardhat Local; add it if missing.
async function ensureHardhatNetwork() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (BigInt(chainId) === HARDHAT_CHAIN_ID) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7A69" }],
    });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x7A69",
          chainName: "Hardhat Local",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["http://127.0.0.1:8545"],
        }],
      });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7A69" }],
      });
    } else {
      throw e;
    }
  }
}

async function fetchContractInfo() {
  const res = await fetch("/contract.json");
  if (!res.ok) {
    throw new Error("Contract not deployed yet. Run: cd blockchain && npx hardhat run scripts/deploy.js --network localhost — then refresh.");
  }
  return res.json();
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(localStorage.getItem("wallet") || null);
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [signer, setSigner] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [ready, setReady] = useState(false);

  const attach = useCallback(async () => {
    if (!account || !window.ethereum) return;
    try {
      await ensureHardhatNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const s = await provider.getSigner();
      const addr = (await s.getAddress()).toLowerCase();
      if (addr !== account) throw new Error("account-changed");
      setSigner(s);
      const info = await fetchContractInfo();
      setContractInfo(info);
    } catch (e) {
      if (e.message === "account-changed") {
        // Wallet switched accounts -> adopt the stored role for this wallet
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: account }),
        }).catch(() => null);
        if (res) {
          const data = await res.json();
          if (data.success) {
            localStorage.setItem("role", data.data.role);
            setRole(data.data.role);
          }
        }
      }
    } finally {
      setReady(true);
    }
  }, [account]);

  useEffect(() => { attach(); }, [attach]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    return () => window.ethereum.removeListener("accountsChanged", onAccounts);
  }, []);

  const connect = useCallback(async (selectedRole) => {
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    await ensureHardhatNetwork();
    const provider = new BrowserProvider(window.ethereum);
    const s = await provider.getSigner();
    const addr = (await s.getAddress()).toLowerCase();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: addr, role: selectedRole }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const user = data.data;
    setAccount(addr);
    setRole(user.role);
    setSigner(s);
    localStorage.setItem("wallet", addr);
    localStorage.setItem("role", user.role);
    const info = await fetchContractInfo();
    setContractInfo(info);
    setReady(true);
    return user.role;
  }, []);

  const logout = useCallback(() => {
    setAccount(null); setRole(null); setSigner(null); setContractInfo(null);
    localStorage.removeItem("wallet"); localStorage.removeItem("role");
  }, []);

  return (
    <AuthContext.Provider value={{ account, role, signer, contractInfo, ready, connect, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

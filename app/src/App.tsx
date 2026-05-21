import { useEffect } from 'react';
import { seedIfEmpty } from './db';
import { useUI } from './state/useUI';
import { Dashboard } from './screens/Dashboard';
import { Analytics } from './screens/Analytics';
import { Accounts } from './screens/Accounts';
import { Me } from './screens/Me';
import { BottomNav } from './components/BottomNav';
import { QuickInputSheet } from './components/QuickInputSheet';
import { TransactionDetail } from './components/TransactionDetail';

export default function App() {
  const { tab } = useUI();

  useEffect(() => {
    void seedIfEmpty();
    void navigator.storage?.persist?.();
  }, []);

  return (
    <>
      {tab === 'home' && <Dashboard />}
      {tab === 'analytics' && <Analytics />}
      {tab === 'accounts' && <Accounts />}
      {tab === 'me' && <Me />}
      <BottomNav />
      <QuickInputSheet />
      <TransactionDetail />
    </>
  );
}

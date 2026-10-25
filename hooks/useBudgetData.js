'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';

const EMPTY_SUMMARY = {
  total_budget: 0,
  total_spent: 0,
  remaining: 0,
  item_count: 0,
  purchase_count: 0,
  allow_overspend: false,
};
const byName = (a, b) => a.name.localeCompare(b.name);
const POLL_MS = 20000; // pick up other members' purchases every 20 seconds

/**
 * Holds the budget list, the purchase history and the balance for the whole app.
 *
 * Every action (add item, record purchase, ...) sends the request to PHP and then
 * applies the server's answer straight to the state, so the balance on screen changes
 * the moment the purchase is saved. A background refresh keeps several people in sync.
 */
export function useBudgetData() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lets us ignore a background refresh that started BEFORE a change was saved,
  // so stale data can never overwrite the fresh balance.
  const version = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++version.current;
    try {
      const [itemsRes, purchasesRes] = await Promise.all([api.items(), api.purchases(200)]);
      if (mine !== version.current) return;
      setItems(itemsRes.items);
      setSummary(itemsRes.summary);
      setPurchases(purchasesRes.purchases);
      setError('');
    } catch (e) {
      if (mine === version.current) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const replaceItem = (item) => {
    if (item) setItems((list) => list.map((x) => (x.id === item.id ? item : x)));
  };

  // ---- budget list ---------------------------------------------------------
  const addItem = async (values) => {
    const res = await api.addItem(values);
    version.current++;
    setItems((list) => [...list, res.item].sort(byName));
    setSummary(res.summary);
  };

  const updateItem = async (id, values) => {
    const res = await api.updateItem(id, values);
    version.current++;
    setItems((list) => list.map((x) => (x.id === id ? res.item : x)).sort(byName));
    setSummary(res.summary);
  };

  const deleteItem = async (id) => {
    const res = await api.deleteItem(id);
    version.current++;
    setItems((list) => list.filter((x) => x.id !== id));
    setSummary(res.summary);
  };

  // ---- purchases -----------------------------------------------------------
  const addPurchase = async (values) => {
    const res = await api.addPurchase(values);
    version.current++;
    setPurchases((list) => [res.purchase, ...list]);
    setSummary(res.summary); // <- the new remaining balance
    replaceItem(res.item);
    return res;
  };

  const voidPurchase = async (id) => {
    const res = await api.voidPurchase(id);
    version.current++;
    setPurchases((list) => list.map((x) => (x.id === id ? res.purchase : x)));
    setSummary(res.summary);
    replaceItem(res.item);
  };

  return {
    items,
    purchases,
    summary,
    loading,
    error,
    refresh,
    addItem,
    updateItem,
    deleteItem,
    addPurchase,
    voidPurchase,
  };
}

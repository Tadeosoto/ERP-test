"use client";

import { useEffect, useState } from "react";
import type { PurchaseCase } from "@/lib/domain/types";
import { getCase, listCases } from "@/lib/data/repository";

export function useCase(id: string): PurchaseCase | undefined {
  const [c, setC] = useState<PurchaseCase | undefined>(() => getCase(id));
  useEffect(() => {
    const load = () => setC(getCase(id));
    load();
    window.addEventListener("ccp-erp-storage", load);
    return () => window.removeEventListener("ccp-erp-storage", load);
  }, [id]);
  return c;
}

export function useCases(): PurchaseCase[] {
  const [cases, setCases] = useState<PurchaseCase[]>([]);
  useEffect(() => {
    const load = () => setCases(listCases());
    load();
    window.addEventListener("ccp-erp-storage", load);
    return () => window.removeEventListener("ccp-erp-storage", load);
  }, []);
  return cases;
}

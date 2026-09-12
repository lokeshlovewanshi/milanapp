import { useState, useEffect, useCallback } from "react";
import { referenceAPI } from "./api";
import { formatCode, loadReferenceOptions } from "./formatters";

let memoryCache = null;

export function useReference() {
  const [options, setOptions] = useState(memoryCache || {});
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let alive = true;
    loadReferenceOptions()
      .then((data) => {
        if (alive) {
          memoryCache = data;
          setOptions(data);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const list = useCallback(
    (category) => options[category] || [],
    [options]
  );

  const label = useCallback(
    (category, code) => formatCode(category, code, options[category]),
    [options]
  );

  return { options, list, label, loading };
}

export function useLocations() {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    referenceAPI
      .states()
      .then((res) => setStates(Array.isArray(res) ? res : res?.data || []))
      .catch(() => {});
  }, []);

  const loadCities = useCallback(async (stateName) => {
    if (!stateName) {
      setCities([]);
      return;
    }
    const match = states.find(
      (s) => s.name?.toLowerCase() === String(stateName).toLowerCase()
    );
    if (!match) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const res = await referenceAPI.cities({ stateId: match.id });
      setCities(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [states]);

  return { states, cities, loadCities, loadingCities };
}

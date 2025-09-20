/** /src/hooks/UseStrategies.ts */

import { useEffect, useState } from 'react';
import { getStrategies } from '../services/StrategyService';
import { Difficulty, Strategy } from '../types/GameTypes';
import { logMessage } from '../utils/Logger';
import { useTranslation } from 'react-i18next';

export const useStrategies = (options?: {
  difficulty?: Difficulty;
  purpose?: 'hint' | 'tutorial';
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getStrategies(options);
        setStrategies(data);
      } catch (error) {
        logMessage('error', 'Strategy load error:', { error: String(error)});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [options?.difficulty, options?.purpose, i18n.language]);

  return { strategies, loading };
};
import { useQuery } from '@tanstack/react-query';
import {
  fetchCarrinhoAbandonoDashboard,
  fetchCarrinhoAbandonoMensal,
} from '../services/carrinhoAbandonoService';
import type { CarrinhoAbandonoFilters } from '../types/carrinhoAbandono';

export function useCarrinhoAbandono(filters: CarrinhoAbandonoFilters, year = new Date().getFullYear()) {
  const dashboard = useQuery({
    queryKey: ['carrinho-abandono-dashboard', filters],
    queryFn: () => fetchCarrinhoAbandonoDashboard(filters),
    keepPreviousData: true,
  });

  const mensal = useQuery({
    queryKey: ['carrinho-abandono-mensal', year],
    queryFn: () => fetchCarrinhoAbandonoMensal(year),
    keepPreviousData: true,
  });

  return {
    dashboard,
    mensal,
  };
}

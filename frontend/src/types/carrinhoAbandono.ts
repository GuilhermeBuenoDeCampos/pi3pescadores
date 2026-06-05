export type CarrinhoAbandonoPeriodo = {
  tipo: string;
  dataInicio: string;
  dataFim: string;
};

export type CarrinhoAbandonoDashboard = {
  totalCarrinhos: number;
  carrinhosFinalizados: number;
  carrinhosAbandonados: number;
  taxaAbandono: number;
  periodo?: CarrinhoAbandonoPeriodo;
};

export type CarrinhoAbandonoMensal = {
  mes: string;
  taxa: number;
};

export type CarrinhoAbandonoFilters = {
  dataInicio?: string;
  dataFim?: string;
  period?: 'day' | '7d' | '30d';
};

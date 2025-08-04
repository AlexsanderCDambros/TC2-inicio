import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_BASE_URL = process.env.API_BASE_URL;

const Inicio = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [creditDebitData, setCreditDebitData] = useState([]);
  const [expenseDistribution, setExpenseDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = (url: string) => {
    window.location.href = url;
  };

  const COLORS = ["#0088FE", "#FF8042", "#FFBB28", "#00C49F", "#8884D8"];

  // Cores específicas para os gráficos conforme solicitado
  const creditDebitColors = ["#4CAF50", "#F44336"];

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const token = sessionStorage.getItem("token");

        // Buscar informações da conta
        const accountResponse = await fetch(`${API_BASE_URL}/account`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!accountResponse.ok) {
          throw new Error("Falha ao buscar dados da conta");
        }

        const accountData = await accountResponse.json();
        const accountId = accountData.result.account[0].id;

        // Buscar transações usando o ID da conta
        const transactionsResponse = await fetch(
          `${API_BASE_URL}/account/${accountId}/statement`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!transactionsResponse.ok) {
          throw new Error("Falha ao buscar transações");
        }

        const transactionsData = await transactionsResponse.json();
        const allTransactions = transactionsData.result.transactions;

        // Ordenar transações por data (mais recente primeiro)
        const sortedTransactions = [...allTransactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setTransactions(sortedTransactions);

        // Calcular saldo
        const calculatedBalance = allTransactions.reduce((acc, transaction) => {
          return acc + transaction.value;
        }, 0);

        setBalance(calculatedBalance);

        // Preparar dados para gráfico de crédito/débito (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransactions = allTransactions.filter(
          (transaction) => new Date(transaction.date) >= thirtyDaysAgo
        );

        const creditSum = recentTransactions
          .filter((t) => t.type === "Credit")
          .reduce((sum, t) => sum + t.value, 0);

        const debitSum = recentTransactions
          .filter((t) => t.type === "Debit")
          .reduce((sum, t) => sum + t.value * -1, 0);

        setCreditDebitData([
          { name: "Créditos", value: creditSum },
          { name: "Débitos", value: debitSum },
        ]);

        // Preparar dados para gráfico de pizza (distribuição por destinatário)
        const expenseTransactions = recentTransactions.filter(
          (t) => t.type === "Debit"
        );

        const expenseByRecipient = expenseTransactions.reduce(
          (acc, transaction) => {
            if (!transaction.to) return acc;

            const existing = acc.find((item) => item.name === transaction.to);
            if (existing) {
              existing.value += transaction.value * -1;
            } else {
              acc.push({ name: transaction.to, value: transaction.value * -1 });
            }
            return acc;
          },
          []
        );

        setExpenseDistribution(expenseByRecipient);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAccountData();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h6">Carregando...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography variant="h6" color="error">
          Erro: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bem-vindo ao seu Painel Financeiro
      </Typography>

      <Grid container spacing={3}>
        {/* Saldo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Saldo Atual
            </Typography>
            <Typography
              variant="h4"
              color={balance >= 0 ? "success.main" : "error.main"}
            >
              R$ {balance.toFixed(2)}
            </Typography>
          </Paper>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate("/transacoes/novo")}
              sx={{ height: "fit-content" }}
            >
              Adicionar Transação
            </Button>
          </Box>
        </Grid>

        {/* Últimas transações */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Últimas 5 Transações
            </Typography>
            <List>
              {transactions.slice(0, 5).map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <ListItem>
                    <ListItemText
                      primary={`${
                        transaction.to || "Sem destinatário"
                      } - R$ ${transaction.value.toFixed(2)}`}
                      secondary={`${new Date(
                        transaction.date
                      ).toLocaleDateString()} - ${transaction.type}`}
                      primaryTypographyProps={{
                        color:
                          transaction.type === "Credit"
                            ? "success.main"
                            : "error.main",
                      }}
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              ))}
              {transactions.length === 0 && (
                <Typography variant="body1" sx={{ p: 2 }}>
                  Nenhuma transação encontrada.
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Gráfico de barras (crédito/débito) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Créditos vs Débitos (últimos 30 dias)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={creditDebitData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip
                  formatter={(value: number) => [
                    `R$ ${value.toFixed(2)}`,
                    "Valor",
                  ]}
                />
                <Bar dataKey="value">
                  {creditDebitData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={creditDebitColors[index % creditDebitColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico de pizza (distribuição de gastos) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: "400px" }}>
            <Typography variant="h6" gutterBottom>
              Distribuição de Gastos por Destinatário (últimos 30 dias)
            </Typography>
            {expenseDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `R$ ${value.toFixed(2)}`,
                      "Valor",
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body1" sx={{ p: 2 }}>
                Nenhum dado de gastos disponível nos últimos 30 dias.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Inicio;

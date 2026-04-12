export const generateInsights = (transactions, goals = {}) => {
  const insights = [];
  if (!transactions || transactions.length === 0) return insights;

  let totalIncome = 0;
  let totalExpense = 0;
  let foodExpense = 0;

  transactions.forEach((tx) => {
    // using usd for standard calculations
    if (tx.type === 'income') {
      totalIncome += tx.amount_usd;
    } else {
      totalExpense += tx.amount_usd;
      if (tx.category.toLowerCase().includes('comida')) {
        foodExpense += tx.amount_usd;
      }
    }
  });

  // Rule 1: Food spending > 30%
  if (totalExpense > 0 && (foodExpense / totalExpense) > 0.3) {
    insights.push({
      id: 'food_warning',
      text: 'Estás gastando más del 30% en comida. ¡Intenta cocinar más en casa!',
      type: 'warning'
    });
  }

  // Rule 2: Deficit
  if (totalExpense > totalIncome && totalIncome > 0) {
    insights.push({
      id: 'deficit_warning',
      text: 'Tus gastos superan tus ingresos este mes. Revisa tus gastos hormiga.',
      type: 'danger'
    });
  }

  // Rule 3: No savings
  if (totalIncome > 0 && totalExpense === totalIncome) {
    insights.push({
      id: 'no_savings',
      text: 'No estás ahorrando nada este mes.',
      type: 'warning'
    });
  }
  
  if (insights.length === 0 && totalIncome > totalExpense) {
      insights.push({
          id: 'good_standing',
          text: '¡Vas muy bien! Tus finanzas están saludables.',
          type: 'success'
      });
  }

  return insights;
};
